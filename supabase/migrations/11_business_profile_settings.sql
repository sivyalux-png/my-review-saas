alter table public.settings
  add column if not exists business_phone text
    check (business_phone is null or length(pg_catalog.btrim(business_phone)) <= 40),
  add column if not exists business_category text
    check (business_category is null or length(pg_catalog.btrim(business_category)) <= 80);

notify pgrst, 'reload schema';
