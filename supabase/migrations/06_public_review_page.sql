alter table public.settings
  add column business_logo_url text;

alter table public.review_requests
  add column rating integer
    check (rating is null or rating between 1 and 5),
  add column feedback text
    check (feedback is null or length(feedback) <= 2000),
  add column reviewed_at timestamptz;

create or replace function public.get_public_review_request(p_request_id uuid)
returns table (
  customer_name text,
  business_name text,
  logo_url text,
  google_review_url text,
  status text,
  rating integer
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    request.customer_name,
    coalesce(nullif(pg_catalog.btrim(settings.business_name), ''), profile.business_name, 'Your business'),
    settings.business_logo_url,
    settings.google_review_link,
    request.status,
    request.rating
  from public.review_requests as request
  join public.profiles as profile on profile.id = request.user_id
  left join public.settings as settings on settings.user_id = request.user_id
  where request.id = p_request_id
    and request.status in ('queued', 'sent', 'completed');
$$;

revoke all on function public.get_public_review_request(uuid) from public;
grant execute on function public.get_public_review_request(uuid) to anon, authenticated;

create or replace function public.submit_public_review_response(
  p_request_id uuid,
  p_rating integer,
  p_feedback text
)
returns table (google_review_url text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  reviewed_request_id uuid;
  normalized_feedback text := nullif(pg_catalog.btrim(coalesce(p_feedback, '')), '');
  saved_google_url text;
begin
  if p_rating is null
    or p_rating not between 1 and 5
    or (normalized_feedback is not null and pg_catalog.length(normalized_feedback) > 2000)
    or (p_rating <= 3 and normalized_feedback is null)
  then
    raise exception using
      errcode = '22023',
      message = 'Rating and feedback are invalid.';
  end if;

  update public.review_requests as request
  set
    rating = p_rating,
    feedback = normalized_feedback,
    status = 'completed',
    reviewed_at = pg_catalog.now()
  where request.id = p_request_id
    and request.status in ('queued', 'sent')
    and request.rating is null
  returning request.id into reviewed_request_id;

  if reviewed_request_id is null then
    raise exception using
      errcode = 'P0001',
      message = 'This review request is unavailable or has already been completed.';
  end if;

  select settings.google_review_link
  into saved_google_url
  from public.review_requests as request
  left join public.settings as settings on settings.user_id = request.user_id
  where request.id = reviewed_request_id;

  return query select saved_google_url;
end;
$$;

revoke all on function public.submit_public_review_response(uuid, integer, text) from public;
grant execute on function public.submit_public_review_response(uuid, integer, text) to anon, authenticated;
