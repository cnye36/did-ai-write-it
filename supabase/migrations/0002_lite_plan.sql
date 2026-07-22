-- M2: add the "lite" plan tier. Run once in the Supabase SQL editor, after 0001.

alter table public.profiles drop constraint profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'lite', 'pro', 'studio'));
