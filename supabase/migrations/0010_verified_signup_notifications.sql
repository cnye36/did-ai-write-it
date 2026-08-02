-- Signup admin notifications should fire only for verified accounts:
-- email confirmation click, or OAuth (Google) where email_confirmed_at is
-- set on insert. The previous Database Webhook on public.profiles INSERT
-- fired for every signup attempt, including unconfirmed email/password rows.
--
-- Flow: auth.users becomes confirmed → insert into verified_signups →
-- Dashboard Database Webhook on verified_signups INSERT →
-- POST /api/admin/notify-signup.

create table public.verified_signups (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references auth.users (id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

alter table public.verified_signups enable row level security;
-- No policies: clients never read/write this. The auth trigger (security
-- definer) inserts rows; the Database Webhook fires on those inserts.

create function public.handle_verified_signup()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    -- Google (and any provider that confirms on create) lands here already
    -- verified. Unconfirmed email/password signups skip this branch.
    if new.email_confirmed_at is not null then
      insert into public.verified_signups (user_id, email)
      values (new.id, coalesce(new.email, ''))
      on conflict (user_id) do nothing;
    end if;
  elsif tg_op = 'UPDATE' then
    -- Email/password user clicked the confirmation link.
    if old.email_confirmed_at is null and new.email_confirmed_at is not null then
      insert into public.verified_signups (user_id, email)
      values (new.id, coalesce(new.email, ''))
      on conflict (user_id) do nothing;
    end if;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_verified
  after insert or update of email_confirmed_at on auth.users
  for each row execute function public.handle_verified_signup();

-- Trigger-only: not meant to be called via the Data API / RPC.
revoke execute on function public.handle_verified_signup() from public, anon, authenticated;
