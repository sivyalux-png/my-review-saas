alter table public.settings enable row level security;

grant select, insert, update on table public.settings to authenticated;

drop policy if exists "Users can view their own settings" on public.settings;
create policy "Users can view their own settings"
on public.settings for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create their own settings" on public.settings;
create policy "Users can create their own settings"
on public.settings for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update their own settings" on public.settings;
create policy "Users can update their own settings"
on public.settings for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);
