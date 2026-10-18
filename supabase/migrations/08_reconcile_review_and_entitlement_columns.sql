do $$
declare
  missing_tables text;
begin
  select pg_catalog.string_agg(required.table_name, ', ' order by required.table_name)
  into missing_tables
  from (values
    ('profiles'),
    ('licenses'),
    ('review_requests'),
    ('settings')
  ) as required(table_name)
  where pg_catalog.to_regclass('public.' || required.table_name) is null;

  if missing_tables is not null then
    raise exception
      'Required public tables are missing: %. Apply migrations 01_initial_schema.sql through 07_appsumo_channel_entitlements.sql in order before this migration.',
      missing_tables;
  end if;
end;
$$;

alter table public.profiles
  add column if not exists plan_tier text,
  add column if not exists monthly_credit_limit integer,
  add column if not exists credits_remaining integer,
  add column if not exists sms_credit_limit integer,
  add column if not exists sms_credits_remaining integer;

alter table public.licenses
  add column if not exists key_last4 text,
  add column if not exists source text not null default 'appsumo',
  add column if not exists tier text not null default 'AppSumo Plus',
  add column if not exists status text not null default 'available',
  add column if not exists user_id uuid references auth.users (id) on delete set null,
  add column if not exists expires_at timestamptz,
  add column if not exists redeemed_at timestamptz;

alter table public.settings
  add column if not exists business_name text,
  add column if not exists google_review_link text,
  add column if not exists private_feedback_url text,
  add column if not exists email_subject text,
  add column if not exists email_body text,
  add column if not exists message_body text,
  add column if not exists business_logo_url text;

alter table public.review_requests
  add column if not exists service text,
  add column if not exists rating integer,
  add column if not exists feedback text,
  add column if not exists reviewed_at timestamptz;

do $$
begin
  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.review_requests'::pg_catalog.regclass
      and conname = 'review_requests_service_check'
  ) then
    alter table public.review_requests
      add constraint review_requests_service_check
      check (service is null or length(pg_catalog.btrim(service)) between 1 and 120);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.review_requests'::pg_catalog.regclass
      and conname = 'review_requests_rating_check'
  ) then
    alter table public.review_requests
      add constraint review_requests_rating_check
      check (rating is null or rating between 1 and 5);
  end if;

  if not exists (
    select 1 from pg_catalog.pg_constraint
    where conrelid = 'public.review_requests'::pg_catalog.regclass
      and conname = 'review_requests_feedback_check'
  ) then
    alter table public.review_requests
      add constraint review_requests_feedback_check
      check (feedback is null or length(feedback) <= 2000);
  end if;
end;
$$;

notify pgrst, 'reload schema';
