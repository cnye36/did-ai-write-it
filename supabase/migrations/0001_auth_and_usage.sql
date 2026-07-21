-- M1: accounts + per-plan monthly word quotas.
-- Run once in the Supabase SQL editor (Project -> SQL Editor -> New query).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro', 'studio')),
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

-- One row per user. "This month" is derived by comparing period_start to the
-- current month, not reset by a cron job.
create table public.usage (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  period_start date not null default date_trunc('month', now())::date,
  words_used integer not null default 0
);

alter table public.usage enable row level security;

create policy "usage_select_own"
  on public.usage for select
  using (auth.uid() = user_id);

-- Auto-provision profiles/usage rows when someone signs up.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  insert into public.usage (user_id) values (new.id);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- The only way words_used can change. security definer so it can run under
-- RLS with the caller's own session (no service-role key needed), and no
-- client-side update policy exists on usage, so a user can't forge their own
-- quota. Rolls the period over first if the stored period_start is stale.
create function public.increment_usage(p_user_id uuid, p_words integer)
returns table (words_used integer, plan text)
language plpgsql
security definer set search_path = public
as $$
declare
  v_period date := date_trunc('month', now())::date;
begin
  update public.usage
  set
    words_used = case when period_start = v_period then usage.words_used + p_words else p_words end,
    period_start = v_period
  where user_id = p_user_id;

  return query
  select u.words_used, p.plan
  from public.usage u
  join public.profiles p on p.id = u.user_id
  where u.user_id = p_user_id;
end;
$$;
