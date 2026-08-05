-- Privileged quota and anonymous-preview accounting must only be callable by
-- server-side code using the service role. RLS does not constrain
-- SECURITY DEFINER functions.

create or replace function public.increment_usage(
  p_user_id uuid,
  p_words integer,
  p_limit integer default null
)
returns table (words_used integer, plan text, ok boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (timezone('utc', now()))::date;
  v_start date;
  v_used integer;
  v_ok boolean;
begin
  if p_words <= 0 then
    raise exception 'p_words must be positive';
  end if;
  if p_limit is not null and p_limit < 0 then
    raise exception 'p_limit must be non-negative';
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

revoke execute on function public.increment_usage(uuid, integer, integer)
  from public, anon, authenticated;
grant execute on function public.increment_usage(uuid, integer, integer)
  to service_role;

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
  v_used integer;
begin
  if p_words <= 0 then
    raise exception 'p_words must be positive';
  end if;

  update public.usage
  set words_used = greatest(0, words_used - p_words)
  where user_id = p_user_id
  returning words_used into v_used;

  if not found then
    raise exception 'usage row not found';
  end if;

  return v_used;
end;
$$;

revoke execute on function public.refund_usage(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.refund_usage(uuid, integer)
  to service_role;

-- Reserve a preview attempt atomically before any Winston request. The
-- transaction-scoped advisory lock serializes requests for the same IP.
create or replace function public.consume_preview_slot(
  p_ip text,
  p_limit integer
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_now timestamptz := now();
  v_count integer;
begin
  if p_ip is null or btrim(p_ip) = '' or length(p_ip) > 128 then
    raise exception 'invalid IP';
  end if;
  if p_limit <= 0 or p_limit > 100 then
    raise exception 'invalid limit';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_ip, 0)
  );

  delete from public.preview_checks
  where created_at < v_now - interval '25 hours';

  select count(*)::integer
    into v_count
  from public.preview_checks
  where ip = p_ip
    and created_at >= v_now - interval '24 hours';

  if v_count >= p_limit then
    return false;
  end if;

  insert into public.preview_checks (ip, created_at)
  values (p_ip, v_now);

  return true;
end;
$$;

revoke execute on function public.consume_preview_slot(text, integer)
  from public, anon, authenticated;
grant execute on function public.consume_preview_slot(text, integer)
  to service_role;

-- Trigger functions do not need Data API access.
revoke execute on function public.handle_new_user()
  from public, anon, authenticated;

-- Make future function exposure opt-in for this project.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

-- Keep anonymous rate-limit records bounded to the rolling-window use case.
create index if not exists preview_checks_created_at_idx
  on public.preview_checks (created_at);
