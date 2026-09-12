-- nt2_state — the single row of synced app state per user.
--
-- This file is the source of truth for the table and its row-level security.
-- It used to exist only as a snippet inside CLOUD_SETUP.md, which meant the
-- security model of the whole app rested on someone having pasted it into the
-- SQL editor once, with nothing able to apply it or check it afterwards. That
-- matters here more than usual: the anon key is committed to the repository on
-- purpose (it ships in the JS bundle anyway), so RLS is the ONLY thing keeping
-- one user's data away from another.
--
-- Every statement is idempotent, so applying this to a project where the table
-- was already created by hand is safe and changes nothing.

create table if not exists public.nt2_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.nt2_state enable row level security;

-- Recreated rather than guarded with "if not exists": a policy that drifted
-- from this definition must be replaced by it, not silently kept.
drop policy if exists "own row select" on public.nt2_state;
create policy "own row select" on public.nt2_state
  for select using (auth.uid() = user_id);

drop policy if exists "own row insert" on public.nt2_state;
create policy "own row insert" on public.nt2_state
  for insert with check (auth.uid() = user_id);

drop policy if exists "own row update" on public.nt2_state;
create policy "own row update" on public.nt2_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own row delete" on public.nt2_state;
create policy "own row delete" on public.nt2_state
  for delete using (auth.uid() = user_id);
