-- Personal Savings Manager: cloud sync table.
-- Run this once in Supabase: SQL Editor -> New query -> paste -> Run.

create table if not exists public.ledgers (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb       not null,
  revision   bigint      not null default 1,
  updated_at timestamptz not null default now()
);

-- Each signed-in user can only see and change their own row.
alter table public.ledgers enable row level security;

drop policy if exists "ledger select own" on public.ledgers;
drop policy if exists "ledger insert own" on public.ledgers;
drop policy if exists "ledger update own" on public.ledgers;

create policy "ledger select own" on public.ledgers
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "ledger insert own" on public.ledgers
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "ledger update own" on public.ledgers
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

grant select, insert, update on public.ledgers to authenticated;
