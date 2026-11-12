create table public.email_credit_purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  price_id text not null,
  credits integer not null,
  transaction_id text unique,
  created_at timestamptz not null default now(),
  fulfilled_at timestamptz,
  constraint email_credit_purchases_valid_pack check (
    (price_id = 'pri_01m72w6j80cecnz57eap0pnemh' and credits = 500)
    or (price_id = 'pri_01m72w9jct9j6a746gtfca1qfp' and credits = 1500)
    or (price_id = 'pri_01m72wc4d9j9cfn1gfn6hjs75d' and credits = 5000)
  ),
  constraint email_credit_purchases_fulfillment_pair check (
    (transaction_id is null and fulfilled_at is null)
    or (transaction_id is not null and fulfilled_at is not null)
  )
);

alter table public.email_credit_purchases enable row level security;

create or replace function public.fulfill_email_credit_purchase(
  p_purchase_id uuid,
  p_transaction_id text,
  p_price_id text
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  purchase public.email_credit_purchases%rowtype;
  updated_credits integer;
begin
  select *
  into purchase
  from public.email_credit_purchases
  where id = p_purchase_id
  for update;

  if not found then
    raise exception 'Email credit purchase intent was not found.';
  end if;

  if purchase.price_id <> p_price_id then
    raise exception 'Transaction price does not match the purchase intent.';
  end if;

  if purchase.fulfilled_at is not null then
    if purchase.transaction_id <> p_transaction_id then
      raise exception 'Email credit purchase was fulfilled by another transaction.';
    end if;

    select credits_remaining
    into updated_credits
    from public.profiles
    where id = purchase.user_id;

    if not found then
      raise exception 'Profile for email credit purchase was not found.';
    end if;

    return updated_credits;
  end if;

  if purchase.created_at < pg_catalog.now() - interval '24 hours' then
    raise exception 'Email credit purchase intent has expired.';
  end if;

  update public.profiles
  set credits_remaining = coalesce(credits_remaining, 0) + purchase.credits
  where id = purchase.user_id
  returning credits_remaining into updated_credits;

  if not found then
    raise exception 'Profile for email credit purchase was not found.';
  end if;

  update public.email_credit_purchases
  set transaction_id = p_transaction_id,
      fulfilled_at = pg_catalog.now()
  where id = p_purchase_id;

  return updated_credits;
end;
$$;

revoke all on function public.fulfill_email_credit_purchase(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.fulfill_email_credit_purchase(uuid, text, text)
  to service_role;

notify pgrst, 'reload schema';
