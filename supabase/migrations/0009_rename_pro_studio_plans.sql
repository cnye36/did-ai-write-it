-- Rename paid plans: pro → plus, studio → pro.
-- Order matters: rewrite old "pro" rows first so they aren't caught by the
-- subsequent studio → pro update.

update public.profiles set plan = 'plus' where plan = 'pro';
update public.profiles set plan = 'pro' where plan = 'studio';

alter table public.profiles drop constraint profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'lite', 'plus', 'pro'));
