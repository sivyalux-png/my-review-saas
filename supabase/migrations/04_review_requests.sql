create table public.review_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  customer_name text not null
    check (length(pg_catalog.btrim(customer_name)) between 1 and 120),
  contact text not null
    check (length(pg_catalog.btrim(contact)) between 1 and 254),
  notes text
    check (notes is null or length(notes) <= 2000),
  status text not null default 'queued'
    check (status in ('queued', 'sent', 'completed', 'cancelled')),
  created_at timestamptz not null default pg_catalog.now()
);

create index review_requests_user_created_idx
  on public.review_requests (user_id, created_at desc);

alter table public.review_requests enable row level security;

create policy "Users can view their own review requests"
on public.review_requests for select
to authenticated
using ((select auth.uid()) = user_id);

grant select on public.review_requests to authenticated;

create or replace function public.create_review_request(
  p_customer_name text,
  p_contact text,
  p_notes text
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
begin
  if current_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'Authentication is required to create a review request.';
  end if;

  if pg_catalog.length(normalized_name) not between 1 and 120
    or pg_catalog.length(normalized_contact) not between 1 and 254
    or (normalized_notes is not null and pg_catalog.length(normalized_notes) > 2000)
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

  insert into public.review_requests (user_id, customer_name, contact, notes)
  values (current_user_id, normalized_name, normalized_contact, normalized_notes);

  update public.profiles
  set credits_remaining = credits_remaining - 1
  where id = current_user_id
  returning credits_remaining into updated_credits;

  return updated_credits;
end;
$$;

revoke all on function public.create_review_request(text, text, text) from public;
revoke all on function public.create_review_request(text, text, text) from anon;
grant execute on function public.create_review_request(text, text, text) to authenticated;
