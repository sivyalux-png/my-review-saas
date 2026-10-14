-- Application profile data for Supabase Auth users.
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  business_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- AppSumo and test license keys are stored as server-generated HMAC-SHA-256
-- hashes, never as redeemable plaintext keys. Keep the HMAC secret server-side.
create table public.licenses (
  id uuid primary key default gen_random_uuid(),
  key_hash text not null unique
    check (key_hash ~ '^[a-f0-9]{64}$'),
  key_last4 text
    check (key_last4 is null or length(key_last4) <= 4),
  source text not null default 'appsumo'
    check (source in ('appsumo', 'test')),
  tier text not null default 'AppSumo Plus',
  status text not null default 'available'
    check (status in ('available', 'redeemed', 'revoked', 'expired')),
  user_id uuid references auth.users (id) on delete set null,
  expires_at timestamptz,
  redeemed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint redeemed_license_has_owner
    check (status <> 'redeemed' or (user_id is not null and redeemed_at is not null)),
  constraint available_license_has_no_redemption
    check (status <> 'available' or (user_id is null and redeemed_at is null))
);

create index licenses_user_id_idx on public.licenses (user_id);
create index licenses_available_idx on public.licenses (status) where status = 'available';

-- Persist the review-request and business preferences shown in the settings UI.
create table public.settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  business_name text,
  google_review_link text,
  private_feedback_url text,
  email_subject text,
  email_body text,
  message_body text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := pg_catalog.now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger licenses_set_updated_at
before update on public.licenses
for each row execute function public.set_updated_at();

create trigger settings_set_updated_at
before update on public.settings
for each row execute function public.set_updated_at();

-- Create a profile when Supabase Auth creates a user. Signup metadata may
-- provide either full_name/business_name or name/business.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, business_name)
  values (
    new.id,
    coalesce(
      nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'name'), '')
    ),
    coalesce(
      nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'business_name'), ''),
      nullif(pg_catalog.btrim(new.raw_user_meta_data ->> 'business'), '')
    )
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.licenses enable row level security;
alter table public.settings enable row level security;

create policy "Users can view their own profile"
on public.profiles for select
to authenticated
using ((select auth.uid()) = id);

create policy "Users can update their own profile"
on public.profiles for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can view their own settings"
on public.settings for select
to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can create their own settings"
on public.settings for insert
to authenticated
with check ((select auth.uid()) = user_id);

create policy "Users can update their own settings"
on public.settings for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "Users can delete their own settings"
on public.settings for delete
to authenticated
using ((select auth.uid()) = user_id);

-- Intentionally no authenticated policies on licenses: only trusted
-- server-side code (using the service role) may manage or inspect key hashes.
