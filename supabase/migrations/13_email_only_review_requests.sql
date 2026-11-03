do $$
declare
  function_signature text;
begin
  for function_signature in
    select pg_catalog.format(
      '%I.%I(%s)',
      namespace.nspname,
      procedure.proname,
      pg_catalog.pg_get_function_identity_arguments(procedure.oid)
    )
    from pg_catalog.pg_proc as procedure
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in ('create_review_request', 'create_review_requests')
      and procedure.prokind = 'f'
  loop
    execute pg_catalog.format('drop function if exists %s cascade', function_signature);
  end loop;
end;
$$;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'review_requests'
      and column_name = 'contact'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'review_requests'
      and column_name = 'customer_email'
  ) then
    alter table public.review_requests rename column contact to customer_email;
  end if;
end;
$$;

alter table public.review_requests
  add column if not exists email_status text not null default 'queued';

alter table public.review_requests
  alter column customer_email drop not null;

update public.review_requests
set email_status = case
  when status in ('sent', 'completed', 'private_feedback_submitted') then 'sent'
  when status = 'cancelled' then 'failed'
  else 'queued'
end;

update public.review_requests
set
  customer_email = null,
  email_status = 'failed',
  status = case when status = 'queued' then 'cancelled' else status end
where customer_email is not null
  and customer_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';

alter table public.review_requests
  drop constraint if exists review_requests_contact_check,
  drop constraint if exists review_requests_customer_email_check,
  drop constraint if exists review_requests_email_status_check,
  add constraint review_requests_customer_email_check
    check (
      customer_email is null
      or (
        length(pg_catalog.btrim(customer_email)) between 3 and 254
        and customer_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
      )
    ),
  add constraint review_requests_email_status_check
    check (email_status in ('queued', 'sending', 'sent', 'failed'));

alter table public.review_requests
  drop column if exists notes,
  drop column if exists service;

create or replace function public.redeem_license(p_key_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  redeemed_tier text;
  redeemed_plan_tier text;
  redeemed_credit_limit integer;
  existing_plan_tier text;
  existing_credit_limit integer;
  existing_credits_remaining integer;
  updated_plan_tier text;
  updated_credit_limit integer;
begin
  if current_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'Authentication is required to redeem a license.';
  end if;

  update public.licenses
  set
    status = 'redeemed',
    user_id = current_user_id,
    redeemed_at = pg_catalog.now()
  where key_hash = p_key_hash
    and status = 'available'
    and (expires_at is null or expires_at > pg_catalog.now())
  returning tier into redeemed_tier;

  if redeemed_tier is null then
    raise exception using
      errcode = 'P0001',
      message = 'License key is invalid, expired, or already redeemed.';
  end if;

  case pg_catalog.lower(pg_catalog.btrim(redeemed_tier))
    when 'tier 1' then
      redeemed_plan_tier := 'Tier 1';
      redeemed_credit_limit := 1000;
    when 'starter' then
      redeemed_plan_tier := 'Tier 1';
      redeemed_credit_limit := 1000;
    when 'tier 2' then
      redeemed_plan_tier := 'Tier 2';
      redeemed_credit_limit := 5000;
    when 'plus' then
      redeemed_plan_tier := 'Tier 2';
      redeemed_credit_limit := 5000;
    when 'appsumo plus' then
      redeemed_plan_tier := 'Tier 2';
      redeemed_credit_limit := 5000;
    when 'growth' then
      redeemed_plan_tier := 'Tier 2';
      redeemed_credit_limit := 5000;
    when 'tier 3' then
      redeemed_plan_tier := 'Tier 3';
      redeemed_credit_limit := 10000;
    when 'unlimited' then
      redeemed_plan_tier := 'Tier 3';
      redeemed_credit_limit := 10000;
    else
      raise exception using
        errcode = '22023',
        message = 'The license tier is not configured for credit allocation.';
  end case;

  select
    profile.plan_tier,
    profile.monthly_credit_limit,
    profile.credits_remaining
  into
    existing_plan_tier,
    existing_credit_limit,
    existing_credits_remaining
  from public.profiles as profile
  where profile.id = current_user_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'The account profile is unavailable for license redemption.';
  end if;

  updated_credit_limit := greatest(
    coalesce(existing_credit_limit, 0),
    redeemed_credit_limit
  );
  if redeemed_credit_limit >= coalesce(existing_credit_limit, 0) then
    updated_plan_tier := redeemed_plan_tier;
  else
    updated_plan_tier := existing_plan_tier;
  end if;

  update public.profiles as profile
  set
    plan_tier = updated_plan_tier,
    monthly_credit_limit = updated_credit_limit,
    credits_remaining =
      coalesce(existing_credits_remaining, 0)
      + greatest(updated_credit_limit - coalesce(existing_credit_limit, 0), 0)
  where profile.id = current_user_id;

  return updated_plan_tier;
end;
$$;

revoke all on function public.redeem_license(text) from public;
revoke all on function public.redeem_license(text) from anon;
grant execute on function public.redeem_license(text) to authenticated;

alter table public.profiles
  drop column if exists sms_credit_limit,
  drop column if exists sms_credits_remaining;

alter table public.settings
  drop column if exists business_phone,
  drop column if exists message_body;

create function public.create_review_request(
  p_customer_name text,
  p_customer_email text
)
returns table (request_id uuid, credits_remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  available_credits integer;
  created_request_id uuid;
  normalized_name text := pg_catalog.btrim(coalesce(p_customer_name, ''));
  normalized_email text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_customer_email, '')));
begin
  if current_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'Authentication is required to create a review request.';
  end if;

  if pg_catalog.length(normalized_name) not between 1 and 120
    or pg_catalog.length(normalized_email) not between 3 and 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception using
      errcode = '22023',
      message = 'Review request details are invalid.';
  end if;

  select profile.credits_remaining
  into available_credits
  from public.profiles as profile
  where profile.id = current_user_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'The account profile is unavailable.';
  end if;

  if available_credits is null then
    raise exception using
      errcode = 'P0001',
      message = 'No active credit entitlement.';
  end if;

  if available_credits < 1 then
    raise exception using
      errcode = 'P0001',
      message = 'No review-request credits remain.';
  end if;

  insert into public.review_requests (user_id, customer_name, customer_email)
  values (current_user_id, normalized_name, normalized_email)
  returning id into created_request_id;

  return query select created_request_id, available_credits;
end;
$$;

revoke all on function public.create_review_request(text, text) from public;
revoke all on function public.create_review_request(text, text) from anon;
grant execute on function public.create_review_request(text, text) to authenticated;

create function public.create_review_requests(p_requests jsonb)
returns table (
  inserted_count integer,
  available_credits integer,
  request_ids uuid[]
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  credits_available integer;
  request_count integer;
  invalid_row_count integer;
  created_request_id uuid;
  created_request_ids uuid[] := array[]::uuid[];
  imported_row record;
begin
  if current_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'Authentication is required to create review requests.';
  end if;

  if p_requests is null or pg_catalog.jsonb_typeof(p_requests) is distinct from 'array' then
    raise exception using
      errcode = '22023',
      message = 'Review request import must be a JSON array.';
  end if;

  request_count := pg_catalog.jsonb_array_length(p_requests);
  if request_count < 1 or request_count > 200 then
    raise exception using
      errcode = '22023',
      message = 'Import between 1 and 200 customers at a time.';
  end if;

  select pg_catalog.count(*)::integer
  into invalid_row_count
  from pg_catalog.jsonb_array_elements(p_requests) as item(value)
  where pg_catalog.jsonb_typeof(item.value) is distinct from 'object'
    or pg_catalog.jsonb_typeof(item.value -> 'name') is distinct from 'string'
    or pg_catalog.jsonb_typeof(item.value -> 'email') is distinct from 'string'
    or pg_catalog.length(pg_catalog.btrim(coalesce(item.value ->> 'name', ''))) not between 1 and 120
    or pg_catalog.length(pg_catalog.btrim(coalesce(item.value ->> 'email', ''))) not between 3 and 254
    or pg_catalog.lower(pg_catalog.btrim(coalesce(item.value ->> 'email', '')))
      !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';

  if invalid_row_count > 0 then
    raise exception using
      errcode = '22023',
      message = 'One or more review request rows are invalid.';
  end if;

  select profile.credits_remaining
  into credits_available
  from public.profiles as profile
  where profile.id = current_user_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'The account profile is unavailable.';
  end if;

  if credits_available is null then
    raise exception using
      errcode = 'P0001',
      message = 'No active credit entitlement.';
  end if;

  if credits_available < request_count then
    raise exception using
      errcode = 'P0001',
      message = pg_catalog.format(
        'Insufficient credits: %s required, %s available.',
        request_count,
        credits_available
      );
  end if;

  for imported_row in
    select
      pg_catalog.btrim(item.value ->> 'name') as customer_name,
      pg_catalog.lower(pg_catalog.btrim(item.value ->> 'email')) as customer_email
    from pg_catalog.jsonb_array_elements(p_requests) with ordinality as item(value, ordinal)
    order by item.ordinal
  loop
    insert into public.review_requests (user_id, customer_name, customer_email)
    values (current_user_id, imported_row.customer_name, imported_row.customer_email)
    returning id into created_request_id;

    created_request_ids := pg_catalog.array_append(created_request_ids, created_request_id);
  end loop;

  return query select request_count, credits_available, created_request_ids;
end;
$$;

revoke all on function public.create_review_requests(jsonb) from public;
revoke all on function public.create_review_requests(jsonb) from anon;
grant execute on function public.create_review_requests(jsonb) to authenticated;

create function public.reserve_review_email_credit(p_request_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user_id uuid;
  available_credits integer;
  updated_credits integer;
begin
  select request.user_id
  into request_user_id
  from public.review_requests as request
  where request.id = p_request_id
    and request.status = 'queued'
    and request.email_status in ('queued', 'failed')
    and request.customer_email is not null
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'This review request is not available for email delivery.';
  end if;

  select profile.credits_remaining
  into available_credits
  from public.profiles as profile
  where profile.id = request_user_id
  for update;

  if available_credits is null then
    raise exception using
      errcode = 'P0001',
      message = 'No active credit entitlement.';
  end if;

  if available_credits < 1 then
    raise exception using
      errcode = 'P0001',
      message = 'No review-request credits remain.';
  end if;

  update public.profiles as profile
  set credits_remaining = profile.credits_remaining - 1
  where profile.id = request_user_id
  returning profile.credits_remaining into updated_credits;

  update public.review_requests as request
  set email_status = 'sending'
  where request.id = p_request_id;

  return updated_credits;
end;
$$;

revoke all on function public.reserve_review_email_credit(uuid) from public, anon, authenticated;
grant execute on function public.reserve_review_email_credit(uuid) to service_role;

create function public.finalize_review_email_dispatch(
  p_request_id uuid,
  p_sent boolean
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user_id uuid;
  updated_credits integer;
begin
  if p_sent is null then
    raise exception using
      errcode = '22023',
      message = 'Email delivery outcome is required.';
  end if;

  select request.user_id
  into request_user_id
  from public.review_requests as request
  where request.id = p_request_id
    and request.email_status = 'sending'
  for update;

  if not found then
    raise exception using
      errcode = 'P0001',
      message = 'This email delivery attempt is not active.';
  end if;

  if p_sent then
    update public.review_requests as request
    set
      email_status = 'sent',
      status = case when request.status = 'queued' then 'sent' else request.status end
    where request.id = p_request_id;
  else
    update public.profiles as profile
    set credits_remaining = profile.credits_remaining + 1
    where profile.id = request_user_id
    returning profile.credits_remaining into updated_credits;

    if not found then
      raise exception using
        errcode = '23503',
        message = 'The account profile is unavailable.';
    end if;

    update public.review_requests as request
    set email_status = 'failed'
    where request.id = p_request_id;
  end if;

  if p_sent then
    select profile.credits_remaining
    into updated_credits
    from public.profiles as profile
    where profile.id = request_user_id;
  end if;

  return updated_credits;
end;
$$;

revoke all on function public.finalize_review_email_dispatch(uuid, boolean) from public, anon, authenticated;
grant execute on function public.finalize_review_email_dispatch(uuid, boolean) to service_role;

notify pgrst, 'reload schema';
