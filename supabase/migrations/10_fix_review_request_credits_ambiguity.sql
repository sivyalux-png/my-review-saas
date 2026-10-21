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
      and procedure.proname = 'create_review_request'
      and procedure.prokind = 'f'
  loop
    execute pg_catalog.format('drop function if exists %s cascade', function_signature);
  end loop;
end;
$$;

create function public.create_review_request(
  p_customer_name text,
  p_contact text,
  p_notes text,
  p_service text
)
returns table (request_id uuid, credits_remaining integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  available_credits integer;
  updated_credits integer;
  created_request_id uuid;
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

  insert into public.review_requests as review_request (
    user_id,
    customer_name,
    contact,
    notes,
    service
  )
  values (
    current_user_id,
    normalized_name,
    normalized_contact,
    normalized_notes,
    normalized_service
  )
  returning review_request.id into created_request_id;

  update public.profiles as profile
  set credits_remaining = profile.credits_remaining - 1
  where profile.id = current_user_id
  returning profile.credits_remaining into updated_credits;

  return query
  select created_request_id, updated_credits;
end;
$$;

revoke all on function public.create_review_request(text, text, text, text) from public;
revoke all on function public.create_review_request(text, text, text, text) from anon;
grant execute on function public.create_review_request(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
