-- Closes a check-then-increment race: every /api/* route pre-checks the plan
-- limit in application code, then does a slow external call (Winston/OpenAI),
-- then calls increment_usage. Concurrent requests can all read the same
-- stale words_used, all pass the pre-check, and all successfully increment
-- afterward, letting a scripted user blow past their monthly limit. The
-- pre-check stays (it's a fast, free fail for the common case) but the limit
-- now also gets enforced here, atomically, under the row lock that already
-- serializes concurrent increments per user. p_limit is null for the
-- dev-bypass account, which skips enforcement entirely.
drop function if exists public.increment_usage(uuid, integer);

create function public.increment_usage(p_user_id uuid, p_words integer, p_limit integer default null)
returns table (words_used integer, plan text, ok boolean)
language plpgsql
security definer set search_path = public
as $$
declare
  v_today date := (timezone('utc', now()))::date;
  v_start date;
  v_used integer;
  v_ok boolean;
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

  if p_limit is not null and v_used + p_words > p_limit then
    v_ok := false;
  else
    v_used := v_used + p_words;
    v_ok := true;
  end if;

  update public.usage
  set words_used = v_used, period_start = v_start
  where user_id = p_user_id;

  return query
  select u.words_used, p.plan, v_ok
  from public.usage u
  join public.profiles p on p.id = u.user_id
  where u.user_id = p_user_id;
end;
$$;
