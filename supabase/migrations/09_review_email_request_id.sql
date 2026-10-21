drop function public.create_review_request(text, text, text, text);

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
  credits_available integer;
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
  )
  returning id into created_request_id;

  update public.profiles
  set credits_remaining = credits_remaining - 1
  where id = current_user_id
  returning credits_remaining into updated_credits;

  return query select created_request_id, updated_credits;
end;
$$;

revoke all on function public.create_review_request(text, text, text, text) from public;
revoke all on function public.create_review_request(text, text, text, text) from anon;
grant execute on function public.create_review_request(text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
