-- Credit cycles are anchored to signup / plan-change day, not the 1st of the
-- calendar month. period_start is the start of the active cycle; a cycle ends
-- (and words_used resets) once today >= period_start + 1 month.

alter table public.usage
  alter column period_start set default (timezone('utc', now()))::date;

-- Advance a stale period_start by whole months until it covers "today", then
-- add words into the active cycle (fresh cycles start at 0 + p_words).
create or replace function public.increment_usage(p_user_id uuid, p_words integer)
returns table (words_used integer, plan text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_today date := (timezone('utc', now()))::date;
  v_start date;
  v_used integer;
begin
  select u.period_start, u.words_used
    into v_start, v_used
  from public.usage u
  where u.user_id = p_user_id
  for update;

  if not found then
    return;
  end if;

  -- Roll forward one calendar month at a time (Jan 31 → Feb 28, same as app).
  while (v_start + interval '1 month')::date <= v_today loop
    v_start := (v_start + interval '1 month')::date;
    v_used := 0;
  end loop;

  v_used := v_used + p_words;

  update public.usage
  set words_used = v_used, period_start = v_start
  where user_id = p_user_id;

  return query
  select u.words_used, p.plan
  from public.usage u
  join public.profiles p on p.id = u.user_id
  where u.user_id = p_user_id;
end;
$$;

-- Free users: anchor the cycle to account creation day instead of the 1st.
update public.usage u
set period_start = (p.created_at at time zone 'utc')::date
from public.profiles p
where p.id = u.user_id
  and p.plan = 'free';

-- Paid users: clear any free-tier usage carried into the paid plan and start
-- a fresh cycle today (one-time heal for accounts upgraded before this change).
update public.usage u
set
  words_used = 0,
  period_start = (timezone('utc', now()))::date
from public.profiles p
where p.id = u.user_id
  and p.plan <> 'free';
