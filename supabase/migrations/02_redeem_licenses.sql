create or replace function public.redeem_license(p_key_hash text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := auth.uid();
  redeemed_tier text;
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

  return redeemed_tier;
end;
$$;

revoke all on function public.redeem_license(text) from public;
revoke all on function public.redeem_license(text) from anon;
grant execute on function public.redeem_license(text) to authenticated;
