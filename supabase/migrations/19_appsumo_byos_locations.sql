alter table public.profiles
  add column if not exists system_email_credits_remaining integer not null default 30
    check (system_email_credits_remaining >= 0);

create or replace function public.normalize_appsumo_license_tier()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if pg_catalog.lower(pg_catalog.btrim(new.tier)) in ('tier_1', 'tier_2', 'tier_3') then
    new.tier := pg_catalog.replace(pg_catalog.lower(pg_catalog.btrim(new.tier)), '_', ' ');
  end if;
  return new;
end;
$$;

update public.licenses
set tier = pg_catalog.replace(pg_catalog.lower(pg_catalog.btrim(tier)), '_', ' ')
where pg_catalog.lower(pg_catalog.btrim(tier)) in ('tier_1', 'tier_2', 'tier_3');

drop trigger if exists licenses_normalize_appsumo_tier on public.licenses;
create trigger licenses_normalize_appsumo_tier
before insert or update on public.licenses
for each row execute function public.normalize_appsumo_license_tier();

revoke all on function public.normalize_appsumo_license_tier() from public, anon, authenticated;

create or replace function public.restore_system_email_credit(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  restored_balance integer;
begin
  update public.profiles
  set system_email_credits_remaining = least(system_email_credits_remaining + 1, 30)
  where id = p_user_id
  returning system_email_credits_remaining into restored_balance;
  if not found then
    raise exception using errcode = '23503', message = 'The account profile is unavailable.';
  end if;
  return restored_balance;
end;
$$;

revoke all on function public.restore_system_email_credit(uuid) from public, anon, authenticated;
grant execute on function public.restore_system_email_credit(uuid) to service_role;

alter table public.settings
  add column if not exists smart_review_gating boolean not null default true,
  add column if not exists auto_follow_up_enabled boolean not null default false;

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  business_name text not null
    check (length(pg_catalog.btrim(business_name)) between 1 and 160),
  business_category text
    check (business_category is null or length(pg_catalog.btrim(business_category)) <= 80),
  google_review_link text,
  private_feedback_url text,
  business_logo_url text,
  email_subject text,
  email_body text,
  smart_review_gating boolean not null default true,
  auto_follow_up_enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index businesses_user_created_idx
  on public.businesses (user_id, created_at, id);

create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

alter table public.businesses enable row level security;

create policy "Users can view their own businesses"
on public.businesses for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can update their own businesses"
on public.businesses for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

grant select, update on public.businesses to authenticated;

insert into public.businesses (
  user_id,
  business_name,
  business_category,
  google_review_link,
  private_feedback_url,
  business_logo_url,
  email_subject,
  email_body,
  smart_review_gating,
  auto_follow_up_enabled
)
select
  profile.id,
  coalesce(
    nullif(pg_catalog.btrim(settings.business_name), ''),
    nullif(pg_catalog.btrim(profile.business_name), ''),
    'Your business'
  ),
  settings.business_category,
  settings.google_review_link,
  settings.private_feedback_url,
  settings.business_logo_url,
  settings.email_subject,
  settings.email_body,
  coalesce(settings.smart_review_gating, true),
  coalesce(settings.auto_follow_up_enabled, false)
from public.profiles as profile
left join public.settings as settings on settings.user_id = profile.id;

alter table public.review_requests
  add column business_id uuid references public.businesses (id) on delete cascade,
  add column email_credit_source text
    check (email_credit_source is null or email_credit_source in ('byos', 'system', 'paid')),
  add column review_link_clicked_at timestamptz,
  add column auto_follow_up_step smallint not null default 0
    check (auto_follow_up_step between 0 and 2),
  add column auto_follow_up_status text not null default 'not_scheduled'
    check (auto_follow_up_status in ('not_scheduled', 'queued', 'sending', 'sent', 'failed')),
  add column auto_follow_up_sent_at timestamptz;

update public.review_requests as request
set business_id = business.id
from public.businesses as business
where business.user_id = request.user_id;

alter table public.review_requests
  alter column business_id set not null;

create index review_requests_business_created_idx
  on public.review_requests (business_id, created_at desc);

create index review_requests_follow_up_due_idx
  on public.review_requests (auto_follow_up_status, created_at)
  where email_status = 'sent' and review_link_clicked_at is null;

create or replace function public.enforce_business_entitlements()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_tier text;
begin
  select profile.plan_tier into current_tier
  from public.profiles as profile
  where profile.id = new.user_id;

  if new.auto_follow_up_enabled and pg_catalog.replace(pg_catalog.lower(pg_catalog.btrim(coalesce(current_tier, ''))), '_', ' ')
    not in ('tier 2', 'tier 3', 'plus', 'appsumo plus', 'growth', 'unlimited')
  then
    raise exception using
      errcode = 'P0001',
      message = 'Auto follow-up is available on Tier 2 and Tier 3.';
  end if;
  return new;
end;
$$;

create trigger businesses_enforce_tier_features
before insert or update on public.businesses
for each row execute function public.enforce_business_entitlements();

revoke all on function public.enforce_business_entitlements() from public, anon, authenticated;

create table public.email_provider_credentials (
  user_id uuid primary key references auth.users (id) on delete cascade,
  provider text not null check (provider in ('resend', 'smtp')),
  from_email text not null
    check (length(pg_catalog.btrim(from_email)) between 3 and 254),
  encrypted_credentials text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger email_provider_credentials_set_updated_at
before update on public.email_provider_credentials
for each row execute function public.set_updated_at();

alter table public.email_provider_credentials enable row level security;
revoke all on public.email_provider_credentials from anon, authenticated;

create table public.private_feedback (
  id uuid primary key default gen_random_uuid(),
  review_request_id uuid not null unique
    references public.review_requests (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  customer_name text not null
    check (length(pg_catalog.btrim(customer_name)) between 1 and 120),
  customer_email text not null
    check (
      length(pg_catalog.btrim(customer_email)) between 3 and 254
      and customer_email ~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ),
  rating integer not null check (rating between 1 and 3),
  feedback text not null
    check (length(pg_catalog.btrim(feedback)) between 1 and 2000),
  created_at timestamptz not null default now()
);

alter table public.private_feedback
  alter column review_request_id drop not null;

create index private_feedback_business_created_idx
  on public.private_feedback (business_id, created_at desc);

alter table public.private_feedback enable row level security;

create policy "Users can view feedback for their businesses"
on public.private_feedback for select to authenticated
using (
  exists (
    select 1
    from public.businesses as business
    where business.id = private_feedback.business_id
      and business.user_id = (select auth.uid())
  )
);

grant select on public.private_feedback to authenticated;

create or replace function public.get_public_business_review(p_business_id uuid)
returns table (
  business_name text,
  logo_url text,
  google_review_url text,
  smart_review_gating boolean,
  show_branding boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    business.business_name,
    case
      when pg_catalog.replace(pg_catalog.lower(pg_catalog.btrim(coalesce(profile.plan_tier, ''))), '_', ' ')
        in ('tier 2', 'tier 3', 'plus', 'appsumo plus', 'growth', 'unlimited')
      then business.business_logo_url
      else null
    end,
    business.google_review_link,
    business.smart_review_gating,
    coalesce(pg_catalog.replace(pg_catalog.lower(pg_catalog.btrim(profile.plan_tier)), '_', ' ') not in (
      'tier 2', 'tier 3', 'plus', 'appsumo plus', 'growth', 'unlimited'
    ), true)
  from public.businesses as business
  join public.profiles as profile on profile.id = business.user_id
  where business.id = p_business_id;
$$;

create or replace function public.submit_business_public_review(
  p_business_id uuid,
  p_rating integer,
  p_customer_name text,
  p_customer_email text,
  p_feedback text
)
returns table (google_review_url text, smart_review_gating boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_business public.businesses%rowtype;
  normalized_name text := pg_catalog.btrim(coalesce(p_customer_name, ''));
  normalized_email text := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_customer_email, ''))), '');
  normalized_feedback text := nullif(pg_catalog.btrim(coalesce(p_feedback, '')), '');
begin
  if p_rating is null or p_rating not between 1 and 5
    or pg_catalog.length(normalized_name) not between 1 and 120
    or (normalized_email is not null and (
      pg_catalog.length(normalized_email) not between 3 and 254
      or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ))
    or (normalized_feedback is not null and pg_catalog.length(normalized_feedback) > 2000)
  then
    raise exception using errcode = '22023', message = 'Rating and feedback are invalid.';
  end if;

  select * into saved_business
  from public.businesses as business
  where business.id = p_business_id;
  if not found then
    raise exception using errcode = 'P0001', message = 'This review page is unavailable.';
  end if;

  if saved_business.smart_review_gating and p_rating <= 3 then
    if normalized_email is null or normalized_feedback is null then
      raise exception using errcode = '22023', message = 'Please enter your email and private feedback.';
    end if;

    insert into public.private_feedback (
      review_request_id, business_id, customer_name, customer_email, rating, feedback
    )
    values (
      null, p_business_id, normalized_name, normalized_email, p_rating, normalized_feedback
    );
    return query select null::text, true;
    return;
  end if;

  return query select saved_business.google_review_link, saved_business.smart_review_gating;
end;
$$;

revoke all on function public.get_public_business_review(uuid) from public;
grant execute on function public.get_public_business_review(uuid) to anon, authenticated;
revoke all on function public.submit_business_public_review(uuid, integer, text, text, text) from public;
grant execute on function public.submit_business_public_review(uuid, integer, text, text, text) to anon, authenticated;

create or replace function public.create_default_business()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.businesses (user_id, business_name)
  values (
    new.id,
    coalesce(nullif(pg_catalog.btrim(new.business_name), ''), 'Your business')
  )
  on conflict do nothing;
  return new;
end;
$$;

create trigger profiles_create_default_business
after insert on public.profiles
for each row execute function public.create_default_business();

revoke all on function public.create_default_business() from public, anon, authenticated;

create or replace function public.create_business(p_business_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  current_tier text;
  current_count integer;
  location_limit integer;
  new_business_id uuid;
  normalized_name text := pg_catalog.btrim(coalesce(p_business_name, ''));
begin
  if current_user_id is null then
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;
  if pg_catalog.length(normalized_name) not between 1 and 160 then
    raise exception using errcode = '22023', message = 'Enter a business name of 1 to 160 characters.';
  end if;

  select profile.plan_tier into current_tier
  from public.profiles as profile
  where profile.id = current_user_id
  for update;
  if not found then
    raise exception using errcode = '23503', message = 'The account profile is unavailable.';
  end if;

  location_limit := case
    when pg_catalog.replace(pg_catalog.lower(pg_catalog.btrim(coalesce(current_tier, ''))), '_', ' ') in ('tier 3', 'unlimited') then null
    when pg_catalog.replace(pg_catalog.lower(pg_catalog.btrim(coalesce(current_tier, ''))), '_', ' ') in ('tier 2', 'plus', 'appsumo plus', 'growth') then 5
    else 1
  end;
  select pg_catalog.count(*)::integer into current_count
  from public.businesses as business
  where business.user_id = current_user_id;

  if location_limit is not null and current_count >= location_limit then
    raise exception using
      errcode = 'P0001',
      message = pg_catalog.format('Your plan allows up to %s business location(s).', location_limit);
  end if;

  insert into public.businesses (user_id, business_name)
  values (current_user_id, normalized_name)
  returning id into new_business_id;
  return new_business_id;
end;
$$;

revoke all on function public.create_business(text) from public, anon;
grant execute on function public.create_business(text) to authenticated;

create or replace function public.create_review_request(
  p_customer_name text,
  p_customer_email text,
  p_business_id uuid
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
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;
  if pg_catalog.length(normalized_name) not between 1 and 120
    or pg_catalog.length(normalized_email) not between 3 and 254
    or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
  then
    raise exception using errcode = '22023', message = 'Review request details are invalid.';
  end if;
  if not exists (
    select 1 from public.businesses as business
    where business.id = p_business_id and business.user_id = current_user_id
  ) then
    raise exception using errcode = '42501', message = 'The selected business is unavailable.';
  end if;

  select coalesce(profile.credits_remaining, 0) + profile.system_email_credits_remaining
  into available_credits
  from public.profiles as profile
  where profile.id = current_user_id;

  if available_credits < 1 and not exists (
    select 1 from public.email_provider_credentials as credentials
    where credentials.user_id = current_user_id
  ) then
    raise exception using errcode = 'P0001', message = 'No review-request credits remain.';
  end if;

  insert into public.review_requests (user_id, business_id, customer_name, customer_email)
  values (current_user_id, p_business_id, normalized_name, normalized_email)
  returning id into created_request_id;
  return query select created_request_id, available_credits;
end;
$$;

drop function if exists public.create_review_request(text, text);
grant execute on function public.create_review_request(text, text, uuid) to authenticated;

create or replace function public.create_review_requests(
  p_requests jsonb,
  p_business_id uuid
)
returns table (inserted_count integer, available_credits integer, request_ids uuid[])
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
    raise exception using errcode = '28000', message = 'Authentication is required.';
  end if;
  if p_requests is null or pg_catalog.jsonb_typeof(p_requests) is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Review request import must be a JSON array.';
  end if;
  request_count := pg_catalog.jsonb_array_length(p_requests);
  if request_count < 1 or request_count > 200 then
    raise exception using errcode = '22023', message = 'Import between 1 and 200 customers at a time.';
  end if;
  if not exists (
    select 1 from public.businesses as business
    where business.id = p_business_id and business.user_id = current_user_id
  ) then
    raise exception using errcode = '42501', message = 'The selected business is unavailable.';
  end if;
  select pg_catalog.count(*)::integer into invalid_row_count
  from pg_catalog.jsonb_array_elements(p_requests) as item(value)
  where pg_catalog.jsonb_typeof(item.value) is distinct from 'object'
    or pg_catalog.jsonb_typeof(item.value -> 'name') is distinct from 'string'
    or pg_catalog.jsonb_typeof(item.value -> 'email') is distinct from 'string'
    or pg_catalog.length(pg_catalog.btrim(coalesce(item.value ->> 'name', ''))) not between 1 and 120
    or pg_catalog.length(pg_catalog.btrim(coalesce(item.value ->> 'email', ''))) not between 3 and 254
    or pg_catalog.lower(pg_catalog.btrim(coalesce(item.value ->> 'email', '')))
      !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$';
  if invalid_row_count > 0 then
    raise exception using errcode = '22023', message = 'One or more review request rows are invalid.';
  end if;

  select coalesce(profile.credits_remaining, 0) + profile.system_email_credits_remaining
  into credits_available
  from public.profiles as profile
  where profile.id = current_user_id;
  if not exists (
    select 1 from public.email_provider_credentials as credentials
    where credentials.user_id = current_user_id
  ) and credits_available < request_count then
    raise exception using
      errcode = 'P0001',
      message = pg_catalog.format('Insufficient credits: %s required, %s available.', request_count, credits_available);
  end if;

  for imported_row in
    select
      pg_catalog.btrim(item.value ->> 'name') as customer_name,
      pg_catalog.lower(pg_catalog.btrim(item.value ->> 'email')) as customer_email
    from pg_catalog.jsonb_array_elements(p_requests) with ordinality as item(value, ordinal)
    order by item.ordinal
  loop
    insert into public.review_requests (user_id, business_id, customer_name, customer_email)
    values (current_user_id, p_business_id, imported_row.customer_name, imported_row.customer_email)
    returning id into created_request_id;
    created_request_ids := pg_catalog.array_append(created_request_ids, created_request_id);
  end loop;
  return query select request_count, credits_available, created_request_ids;
end;
$$;

drop function if exists public.create_review_requests(jsonb);
grant execute on function public.create_review_requests(jsonb, uuid) to authenticated;

create or replace function public.reserve_review_email_credit(p_request_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  request_user_id uuid;
  remaining integer;
  credit_source text;
begin
  select request.user_id into request_user_id
  from public.review_requests as request
  where request.id = p_request_id
    and request.status = 'queued'
    and request.email_status in ('queued', 'failed')
    and request.customer_email is not null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'This review request is not available for email delivery.';
  end if;

  perform 1 from public.profiles as profile
  where profile.id = request_user_id
  for update;
  if not found then
    raise exception using errcode = '23503', message = 'The account profile is unavailable.';
  end if;

  if exists (
    select 1 from public.email_provider_credentials as credentials
    where credentials.user_id = request_user_id
  ) then
    credit_source := 'byos';
  else
    update public.profiles as profile
    set system_email_credits_remaining = profile.system_email_credits_remaining - 1
    where profile.id = request_user_id
      and profile.system_email_credits_remaining > 0
    returning profile.system_email_credits_remaining into remaining;
    if found then
      credit_source := 'system';
    else
      update public.profiles as profile
      set credits_remaining = profile.credits_remaining - 1
      where profile.id = request_user_id
        and profile.credits_remaining > 0
      returning profile.credits_remaining into remaining;
      if not found then
        raise exception using errcode = 'P0001', message = 'No review-request credits remain.';
      end if;
      credit_source := 'paid';
    end if;
  end if;

  update public.review_requests as request
  set email_status = 'sending', email_credit_source = credit_source
  where request.id = p_request_id;

  select coalesce(profile.credits_remaining, 0) + profile.system_email_credits_remaining
  into remaining
  from public.profiles as profile
  where profile.id = request_user_id;
  return remaining;
end;
$$;

drop function if exists public.get_public_review_request(uuid);

create or replace function public.finalize_review_email_dispatch(
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
  credit_source text;
  updated_credits integer;
begin
  if p_sent is null then
    raise exception using errcode = '22023', message = 'Email delivery outcome is required.';
  end if;

  select request.user_id, request.email_credit_source
  into request_user_id, credit_source
  from public.review_requests as request
  where request.id = p_request_id and request.email_status = 'sending'
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'This email delivery attempt is not active.';
  end if;

  if p_sent then
    update public.review_requests as request
    set
      email_status = 'sent',
      status = case when request.status = 'queued' then 'sent' else request.status end,
      auto_follow_up_status = case
        when exists (
          select 1 from public.businesses as business
          where business.id = request.business_id and business.auto_follow_up_enabled
        ) then 'queued'
        else 'not_scheduled'
      end
    where request.id = p_request_id;
  else
    if credit_source = 'system' then
      update public.profiles
      set system_email_credits_remaining = system_email_credits_remaining + 1
      where id = request_user_id;
    elsif credit_source = 'paid' then
      update public.profiles
      set credits_remaining = credits_remaining + 1
      where id = request_user_id;
    end if;
    update public.review_requests as request
    set email_status = 'failed', email_credit_source = null
    where request.id = p_request_id;
  end if;

  select coalesce(profile.credits_remaining, 0) + profile.system_email_credits_remaining
  into updated_credits
  from public.profiles as profile
  where profile.id = request_user_id;
  return updated_credits;
end;
$$;

revoke all on function public.reserve_review_email_credit(uuid) from public, anon, authenticated;
grant execute on function public.reserve_review_email_credit(uuid) to service_role;
revoke all on function public.finalize_review_email_dispatch(uuid, boolean) from public, anon, authenticated;
grant execute on function public.finalize_review_email_dispatch(uuid, boolean) to service_role;

create or replace function public.get_public_review_request(p_request_id uuid)
returns table (
  customer_name text,
  business_name text,
  logo_url text,
  google_review_url text,
  status text,
  rating integer,
  smart_review_gating boolean,
  show_branding boolean
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.review_requests as request
  set review_link_clicked_at = coalesce(request.review_link_clicked_at, pg_catalog.now())
  where request.id = p_request_id
    and request.email_status = 'sent'
    and request.review_link_clicked_at is null;

  return query
  select
    request.customer_name,
    business.business_name,
    case
      when pg_catalog.replace(pg_catalog.lower(pg_catalog.btrim(coalesce(profile.plan_tier, ''))), '_', ' ')
        in ('tier 2', 'tier 3', 'plus', 'appsumo plus', 'growth', 'unlimited')
      then business.business_logo_url
      else null
    end,
    business.google_review_link,
    request.status,
    request.rating,
    business.smart_review_gating,
    coalesce(pg_catalog.replace(pg_catalog.lower(pg_catalog.btrim(profile.plan_tier)), '_', ' ') not in (
      'tier 2', 'tier 3', 'plus', 'appsumo plus', 'growth', 'unlimited'
    ), true)
  from public.review_requests as request
  join public.businesses as business on business.id = request.business_id
  join public.profiles as profile on profile.id = request.user_id
  where request.id = p_request_id
    and request.status in ('queued', 'sent', 'completed', 'private_feedback_submitted');
end;
$$;

drop function if exists public.submit_public_review_response(uuid, integer, text);
create or replace function public.submit_public_review_response(
  p_request_id uuid,
  p_rating integer,
  p_customer_name text,
  p_customer_email text,
  p_feedback text
)
returns table (google_review_url text, smart_review_gating boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved_request public.review_requests%rowtype;
  saved_business public.businesses%rowtype;
  normalized_name text := pg_catalog.btrim(coalesce(p_customer_name, ''));
  normalized_email text := nullif(pg_catalog.lower(pg_catalog.btrim(coalesce(p_customer_email, ''))), '');
  normalized_feedback text := nullif(pg_catalog.btrim(coalesce(p_feedback, '')), '');
begin
  if p_rating is null or p_rating not between 1 and 5
    or pg_catalog.length(normalized_name) not between 1 and 120
    or (normalized_email is not null and (
      pg_catalog.length(normalized_email) not between 3 and 254
      or normalized_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ))
    or (normalized_feedback is not null and pg_catalog.length(normalized_feedback) > 2000)
  then
    raise exception using errcode = '22023', message = 'Rating and feedback are invalid.';
  end if;

  select * into saved_request
  from public.review_requests as request
  where request.id = p_request_id
    and request.status in ('queued', 'sent')
    and request.rating is null
  for update;
  if not found then
    raise exception using errcode = 'P0001', message = 'This review request is unavailable or has already been completed.';
  end if;

  select * into saved_business
  from public.businesses as business
  where business.id = saved_request.business_id;
  if saved_business.smart_review_gating and p_rating <= 3
    and (normalized_feedback is null or normalized_email is null)
  then
    raise exception using errcode = '22023', message = 'Please enter private feedback for ratings of 1 to 3 stars.';
  end if;

  update public.review_requests as request
  set
    customer_name = normalized_name,
    rating = p_rating,
    feedback = case when saved_business.smart_review_gating and p_rating <= 3 then normalized_feedback else null end,
    status = case
      when saved_business.smart_review_gating and p_rating <= 3 then 'private_feedback_submitted'
      else 'completed'
    end,
    reviewed_at = pg_catalog.now()
  where request.id = p_request_id;

  if saved_business.smart_review_gating and p_rating <= 3 then
    insert into public.private_feedback (
      review_request_id, business_id, customer_name, customer_email, rating, feedback
    )
    values (
      p_request_id, saved_request.business_id, normalized_name, normalized_email, p_rating, normalized_feedback
    );
    return query select null::text, true;
  end if;

  return query select saved_business.google_review_link, saved_business.smart_review_gating;
end;
$$;

revoke all on function public.get_public_review_request(uuid) from public;
grant execute on function public.get_public_review_request(uuid) to anon, authenticated;
revoke all on function public.submit_public_review_response(uuid, integer, text, text, text) from public;
grant execute on function public.submit_public_review_response(uuid, integer, text, text, text) to anon, authenticated;

create or replace function public.claim_due_review_followups(p_limit integer default 50)
returns table (
  request_id uuid,
  user_id uuid,
  business_id uuid,
  customer_name text,
  customer_email text,
  business_name text,
  google_review_link text,
  follow_up_step smallint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_limit is null or p_limit not between 1 and 200 then
    raise exception using errcode = '22023', message = 'Follow-up batch size must be between 1 and 200.';
  end if;

  return query
  with due as (
    select request.id
    from public.review_requests as request
    join public.businesses as business on business.id = request.business_id
    join public.profiles as profile on profile.id = request.user_id
    where request.email_status = 'sent'
      and request.auto_follow_up_status in ('queued', 'failed')
      and request.review_link_clicked_at is null
      and business.auto_follow_up_enabled
      and business.google_review_link is not null
      and (
        (
          request.auto_follow_up_step = 0
          and request.created_at <= pg_catalog.now() - interval '3 days'
          and pg_catalog.replace(pg_catalog.lower(pg_catalog.btrim(coalesce(profile.plan_tier, ''))), '_', ' ') in (
            'tier 2', 'tier 3', 'plus', 'appsumo plus', 'growth', 'unlimited'
          )
        )
        or (
          request.auto_follow_up_step = 1
          and request.created_at <= pg_catalog.now() - interval '7 days'
          and pg_catalog.replace(pg_catalog.lower(pg_catalog.btrim(coalesce(profile.plan_tier, ''))), '_', ' ') in (
            'tier 3', 'unlimited'
          )
        )
      )
    order by request.created_at
    limit p_limit
    for update of request skip locked
  ),
  claimed as (
    update public.review_requests as request
    set auto_follow_up_status = 'sending'
    from due
    where request.id = due.id
    returning
      request.id,
      request.user_id,
      request.business_id,
      request.customer_name,
      request.customer_email,
      request.auto_follow_up_step
  )
  select
    claimed.id,
    claimed.user_id,
    claimed.business_id,
    claimed.customer_name,
    claimed.customer_email,
    business.business_name,
    business.google_review_link,
    claimed.auto_follow_up_step
  from claimed
  join public.businesses as business on business.id = claimed.business_id;
end;
$$;

create or replace function public.finish_review_followup(p_request_id uuid, p_sent boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_sent is null then
    raise exception using errcode = '22023', message = 'Email delivery outcome is required.';
  end if;
  update public.review_requests as request
  set
    auto_follow_up_status = case
      when not p_sent then 'failed'
      when request.auto_follow_up_step = 0 and pg_catalog.replace(pg_catalog.lower(pg_catalog.btrim(coalesce((
        select profile.plan_tier
        from public.profiles as profile
        where profile.id = request.user_id
      ), ''))), '_', ' ') in ('tier 3', 'unlimited') then 'queued'
      else 'sent'
    end,
    auto_follow_up_step = case when p_sent then request.auto_follow_up_step + 1 else request.auto_follow_up_step end,
    auto_follow_up_sent_at = case when p_sent then pg_catalog.now() else request.auto_follow_up_sent_at end
  where request.id = p_request_id and request.auto_follow_up_status = 'sending';
  if not found then
    raise exception using errcode = 'P0001', message = 'This follow-up attempt is not active.';
  end if;
end;
$$;

revoke all on function public.claim_due_review_followups(integer) from public, anon, authenticated;
grant execute on function public.claim_due_review_followups(integer) to service_role;
revoke all on function public.finish_review_followup(uuid, boolean) from public, anon, authenticated;
grant execute on function public.finish_review_followup(uuid, boolean) to service_role;

notify pgrst, 'reload schema';
