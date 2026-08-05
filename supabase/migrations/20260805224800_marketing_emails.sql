-- Explicit opt-in for product / marketing emails (GDPR-friendly default: off).
-- Source of truth is profiles.marketing_emails, not auth.users raw_user_meta_data.
-- Metadata is only read once at signup to seed the column for email/password signups.

alter table public.profiles
  add column if not exists marketing_emails boolean not null default false,
  add column if not exists marketing_emails_updated_at timestamptz;

comment on column public.profiles.marketing_emails is
  'User opted in to product updates and tip emails. Default false. Transactional mail is unaffected.';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_marketing boolean := false;
begin
  begin
    v_marketing := coalesce((new.raw_user_meta_data->>'marketing_emails')::boolean, false);
  exception when others then
    v_marketing := false;
  end;

  insert into public.profiles (id, email, marketing_emails, marketing_emails_updated_at)
  values (
    new.id,
    new.email,
    v_marketing,
    case when v_marketing then now() else null end
  );
  insert into public.usage (user_id) values (new.id);
  return new;
end;
$$;

revoke execute on function public.handle_new_user()
  from public, anon, authenticated;

-- Authenticated users may flip only this preference for themselves.
create or replace function public.set_marketing_emails(p_enabled boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  update public.profiles
  set
    marketing_emails = p_enabled,
    marketing_emails_updated_at = now()
  where id = auth.uid();

  if not found then
    raise exception 'Profile not found';
  end if;

  return p_enabled;
end;
$$;

revoke execute on function public.set_marketing_emails(boolean)
  from public, anon;
grant execute on function public.set_marketing_emails(boolean)
  to authenticated;
