alter table public.review_requests
  add column service text
    check (service is null or length(pg_catalog.btrim(service)) between 1 and 120);

create or replace function public.create_review_request(
  p_customer_name text,
  p_contact text,
  p_notes text,
  p_service text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  credits_available integer;
  updated_credits integer;
  normalized_name text := pg_catalog.btrim(coalesce(p_customer_name, ''));
  normalized_contact text := pg_catalog.btrim(coalesce(p_contact, ''));
  normalized_notes text := nullif(pg_catalog.btrim(coalesce(p_notes, '')), '');
  normalized_service text := nullif(pg_catalog.btrim(coalesce(p_service, '')), '');
begin
  if current_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'Authentication is required to create a review request.';
  end if;

  if pg_catalog.length(normalized_name) not between 1 and 120
    or pg_catalog.length(normalized_contact) not between 1 and 254
    or (normalized_notes is not null and pg_catalog.length(normalized_notes) > 2000)
    or (normalized_service is not null and pg_catalog.length(normalized_service) > 120)
  then
    raise exception using
      errcode = '22023',
      message = 'Review request details are invalid.';
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

  if credits_available < 1 then
    raise exception using
      errcode = 'P0001',
      message = 'No review-request credits remain.';
  end if;

  insert into public.review_requests (user_id, customer_name, contact, notes, service)
  values (
    current_user_id,
    normalized_name,
    normalized_contact,
    normalized_notes,
    normalized_service
  );

  update public.profiles
  set credits_remaining = credits_remaining - 1
  where id = current_user_id
  returning credits_remaining into updated_credits;

  return updated_credits;
end;
$$;

revoke all on function public.create_review_request(text, text, text, text) from public;
revoke all on function public.create_review_request(text, text, text, text) from anon;
grant execute on function public.create_review_request(text, text, text, text) to authenticated;

create or replace function public.create_review_requests(p_requests jsonb)
returns table (inserted_count integer, available_credits integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  credits_available integer;
  updated_credits integer;
  request_count integer;
  invalid_row_count integer;
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
  where pg_catalog.jsonb_typeof(item.value) <> 'object'
    or pg_catalog.jsonb_typeof(item.value -> 'name') <> 'string'
    or pg_catalog.jsonb_typeof(item.value -> 'contact') <> 'string'
    or pg_catalog.jsonb_typeof(item.value -> 'service') <> 'string'
    or pg_catalog.length(pg_catalog.btrim(coalesce(item.value ->> 'name', ''))) not between 1 and 120
    or pg_catalog.length(pg_catalog.btrim(coalesce(item.value ->> 'contact', ''))) not between 1 and 254
    or pg_catalog.length(pg_catalog.btrim(coalesce(item.value ->> 'service', ''))) not between 1 and 120;

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

  insert into public.review_requests (user_id, customer_name, contact, service)
  select
    current_user_id,
    pg_catalog.btrim(imported.name),
    pg_catalog.btrim(imported.contact),
    pg_catalog.btrim(imported.service)
  from pg_catalog.jsonb_to_recordset(p_requests) as imported(
    name text,
    contact text,
    service text
  );

  update public.profiles
  set credits_remaining = credits_remaining - request_count
  where id = current_user_id
  returning credits_remaining into updated_credits;

  return query select request_count, updated_credits;
end;
$$;

revoke all on function public.create_review_requests(jsonb) from public;
revoke all on function public.create_review_requests(jsonb) from anon;
grant execute on function public.create_review_requests(jsonb) to authenticated;
