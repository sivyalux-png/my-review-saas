alter table public.profiles
  add column plan_tier text,
  add column monthly_credit_limit integer,
  add column credits_remaining integer;

alter table public.profiles
  add constraint profiles_monthly_credit_limit_nonnegative
    check (monthly_credit_limit is null or monthly_credit_limit >= 0),
  add constraint profiles_credits_remaining_nonnegative
    check (credits_remaining is null or credits_remaining >= 0);

with ranked_entitlements as (
  select
    user_id,
    case
      when pg_catalog.lower(pg_catalog.btrim(tier)) in ('tier 1', 'starter') then 'Starter'
      when pg_catalog.lower(pg_catalog.btrim(tier)) in ('tier 2', 'plus', 'appsumo plus') then 'Plus'
      when pg_catalog.lower(pg_catalog.btrim(tier)) = 'growth' then 'Growth'
      when pg_catalog.lower(pg_catalog.btrim(tier)) in ('tier 3', 'unlimited') then 'Unlimited'
    end as plan_tier,
    case
      when pg_catalog.lower(pg_catalog.btrim(tier)) in ('tier 1', 'starter') then 500
      when pg_catalog.lower(pg_catalog.btrim(tier)) in ('tier 2', 'plus', 'appsumo plus') then 2000
      when pg_catalog.lower(pg_catalog.btrim(tier)) = 'growth' then 5000
      when pg_catalog.lower(pg_catalog.btrim(tier)) in ('tier 3', 'unlimited') then 10000
    end as monthly_credit_limit,
    pg_catalog.row_number() over (
      partition by user_id
      order by
        case
          when pg_catalog.lower(pg_catalog.btrim(tier)) in ('tier 1', 'starter') then 500
          when pg_catalog.lower(pg_catalog.btrim(tier)) in ('tier 2', 'plus', 'appsumo plus') then 2000
          when pg_catalog.lower(pg_catalog.btrim(tier)) = 'growth' then 5000
          when pg_catalog.lower(pg_catalog.btrim(tier)) in ('tier 3', 'unlimited') then 10000
          else 0
        end desc,
        redeemed_at desc
    ) as position
  from public.licenses
  where status = 'redeemed'
    and user_id is not null
)
update public.profiles as profile
set
  plan_tier = entitlement.plan_tier,
  monthly_credit_limit = entitlement.monthly_credit_limit,
  credits_remaining = entitlement.monthly_credit_limit
from ranked_entitlements as entitlement
where entitlement.position = 1
  and entitlement.user_id = profile.id
  and entitlement.plan_tier is not null;

create or replace function public.redeem_license(p_key_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  redeemed_tier text;
  redeemed_plan_tier text;
  redeemed_credit_limit integer;
  existing_plan_tier text;
  existing_credit_limit integer;
  existing_credits_remaining integer;
  updated_plan_tier text;
  updated_credit_limit integer;
begin
  if current_user_id is null then
    raise exception using
      errcode = '28000',
      message = 'Authentication is required to redeem a license.';
  end if;

  update public.licenses
  set
    status = 'redeemed',
    user_id = current_user_id,
    redeemed_at = pg_catalog.now()
  where key_hash = p_key_hash
    and status = 'available'
    and (expires_at is null or expires_at > pg_catalog.now())
  returning tier into redeemed_tier;

  if redeemed_tier is null then
    raise exception using
      errcode = 'P0001',
      message = 'License key is invalid, expired, or already redeemed.';
  end if;

  case pg_catalog.lower(pg_catalog.btrim(redeemed_tier))
    when 'tier 1' then
      redeemed_plan_tier := 'Starter';
      redeemed_credit_limit := 500;
    when 'starter' then
      redeemed_plan_tier := 'Starter';
      redeemed_credit_limit := 500;
    when 'tier 2' then
      redeemed_plan_tier := 'Plus';
      redeemed_credit_limit := 2000;
    when 'plus' then
      redeemed_plan_tier := 'Plus';
      redeemed_credit_limit := 2000;
    when 'appsumo plus' then
      redeemed_plan_tier := 'Plus';
      redeemed_credit_limit := 2000;
    when 'growth' then
      redeemed_plan_tier := 'Growth';
      redeemed_credit_limit := 5000;
    when 'tier 3' then
      redeemed_plan_tier := 'Unlimited';
      redeemed_credit_limit := 10000;
    when 'unlimited' then
      redeemed_plan_tier := 'Unlimited';
      redeemed_credit_limit := 10000;
    else
      raise exception using
        errcode = '22023',
        message = 'The license tier is not configured for credit allocation.';
  end case;

  select
    profile.plan_tier,
    profile.monthly_credit_limit,
    profile.credits_remaining
  into
    existing_plan_tier,
    existing_credit_limit,
    existing_credits_remaining
  from public.profiles as profile
  where profile.id = current_user_id
  for update;

  if not found then
    raise exception using
      errcode = '23503',
      message = 'The account profile is unavailable for license redemption.';
  end if;

  updated_credit_limit := greatest(
    coalesce(existing_credit_limit, 0),
    redeemed_credit_limit
  );

  if redeemed_credit_limit >= coalesce(existing_credit_limit, 0) then
    updated_plan_tier := redeemed_plan_tier;
  else
    updated_plan_tier := existing_plan_tier;
  end if;

  update public.profiles
  set
    plan_tier = updated_plan_tier,
    monthly_credit_limit = updated_credit_limit,
    credits_remaining =
      coalesce(existing_credits_remaining, 0)
      + greatest(
        updated_credit_limit - coalesce(existing_credit_limit, 0),
        0
      )
  where id = current_user_id;

  return updated_plan_tier;
end;
$$;

revoke all on function public.redeem_license(text) from public;
revoke all on function public.redeem_license(text) from anon;
grant execute on function public.redeem_license(text) to authenticated;
