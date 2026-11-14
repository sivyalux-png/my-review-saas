alter table public.email_credit_purchases
  drop constraint if exists email_credit_purchases_valid_pack;

alter table public.email_credit_purchases
  add constraint email_credit_purchases_valid_pack check (
    (price_id = 'pri_01m72w6j80cecnz57eap0pnemh' and credits = 500)
    or (price_id = 'pri_01m72w9jct9j6a746gtfca1qfp' and credits = 1500)
    or (price_id = 'pri_01m72wc4d9j9cfn1gfn6hjs75d' and credits = 5000)
    or (price_id = 'pri_01m7aw9beefjk38t2s7zzjsrzx' and credits = 500)
    or (price_id = 'pri_01m7aw9c09whw02mn3qn0xqz5w' and credits = 1500)
    or (price_id = 'pri_01m7aw9cj6gwn1efax39y4g28m' and credits = 5000)
  );
