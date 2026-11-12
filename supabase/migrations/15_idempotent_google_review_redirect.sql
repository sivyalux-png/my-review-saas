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
    status = case
      when p_rating <= 3 then 'private_feedback_submitted'
      else 'completed'
    end,
    reviewed_at = pg_catalog.now()
  where request.id = p_request_id
    and request.status in ('queued', 'sent')
    and request.rating is null
  returning request.id into reviewed_request_id;

  if reviewed_request_id is null then
    select request.id, settings.google_review_link
    into reviewed_request_id, saved_google_url
    from public.review_requests as request
    left join public.settings as settings on settings.user_id = request.user_id
    where request.id = p_request_id
      and request.status = 'completed'
      and request.rating = p_rating
      and p_rating >= 4
      and normalized_feedback is null;

    if reviewed_request_id is null then
      raise exception using
        errcode = 'P0001',
        message = 'This review request is unavailable or has already been completed.';
    end if;

    return query select saved_google_url;
    return;
  end if;

  select settings.google_review_link
  into saved_google_url
  from public.review_requests as request
  left join public.settings as settings on settings.user_id = request.user_id
  where request.id = reviewed_request_id;

  return query select saved_google_url;
end;
$$;

notify pgrst, 'reload schema';
