-- Daily call quota for the writing-feedback edge function.
--
-- The function is reachable by anyone holding the anon key, which is public by
-- design. Without a counter the model bill has no ceiling and abuse is only
-- discovered on an invoice. The edge function calls bump_ai_usage() with the
-- service-role key on every request and refuses the call past the limit.
--
-- Deliberately NOT reachable from the browser: no RLS policy is created, so
-- every non-service role is denied, and EXECUTE on the function is granted to
-- service_role only. A user cannot read, reset, or inspect their own counter.

create table if not exists public.ai_usage (
  caller  text    not null,
  day     date    not null,
  count   integer not null default 0,
  primary key (caller, day)
);

-- Enabled with zero policies: service_role bypasses RLS, everyone else is
-- refused. This is intentional, not an oversight.
alter table public.ai_usage enable row level security;

-- Atomic increment. Returns the running total for the day AFTER this call, so
-- two concurrent requests can never both read the same pre-increment value.
create or replace function public.bump_ai_usage(p_caller text, p_day date)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.ai_usage as u (caller, day, count)
  values (p_caller, p_day, 1)
  on conflict (caller, day)
  do update set count = u.count + 1
  returning u.count into new_count;
  return new_count;
end;
$$;

revoke all on function public.bump_ai_usage(text, date) from public;
revoke all on function public.bump_ai_usage(text, date) from anon;
revoke all on function public.bump_ai_usage(text, date) from authenticated;
grant execute on function public.bump_ai_usage(text, date) to service_role;

-- Housekeeping: the table only needs recent days. Safe to run any time.
create index if not exists ai_usage_day_idx on public.ai_usage (day);
