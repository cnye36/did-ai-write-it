-- Make refund_usage period-aware and row-locked, matching increment_usage.
-- A refund that lands after a period rollover must not subtract from the new
-- cycle's words_used (or zero it out via greatest).

create or replace function public.refund_usage(
  p_user_id uuid,
  p_words integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (timezone('utc', now()))::date;
  v_start date;
  v_used integer;
begin
  if p_words <= 0 then
    raise exception 'p_words must be positive';
  end if;

  select u.period_start, u.words_used
    into v_start, v_used
  from public.usage u
  where u.user_id = p_user_id
  for update;

  if not found then
    raise exception 'usage row not found';
  end if;

  while (v_start + interval '1 month')::date <= v_today loop
    v_start := (v_start + interval '1 month')::date;
    v_used := 0;
  end loop;

  -- Reservation belonged to the previous cycle that just rolled; nothing to
  -- undo in the fresh period.
  if v_used = 0 then
    update public.usage
    set words_used = 0, period_start = v_start
    where user_id = p_user_id;
    return 0;
  end if;

  v_used := greatest(0, v_used - p_words);

  update public.usage
  set words_used = v_used, period_start = v_start
  where user_id = p_user_id;

  return v_used;
end;
$$;

revoke execute on function public.refund_usage(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.refund_usage(uuid, integer)
  to service_role;
