-- In-app bug reports and feedback (feedback widget, behind auth).
-- No select policy for authenticated: only the sender can insert, only
-- ADMIN_EMAIL (via the service-role client on /admin/feedback) can read.

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('bug', 'feedback')),
  message text not null check (char_length(message) > 0),
  page_url text,
  created_at timestamptz not null default now()
);

create index feedback_created_idx on public.feedback (created_at desc);

alter table public.feedback enable row level security;

grant insert on public.feedback to authenticated;
grant all on public.feedback to service_role;

create policy "feedback_insert_own"
  on public.feedback for insert
  to authenticated
  with check (auth.uid() = user_id);
