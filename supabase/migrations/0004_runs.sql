-- Saved report/run history per user.
-- Each successful detector, plagiarism, or fact-check result is persisted
-- so users can reopen the full breakdown from the app sidebar.

create table public.runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null check (kind in ('detect', 'plagiarism', 'fact_check', 'humanize')),
  title text not null,
  input_text text not null,
  word_count integer not null default 0 check (word_count >= 0),
  score integer check (score is null or (score >= 0 and score <= 100)),
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index runs_user_created_idx on public.runs (user_id, created_at desc);

alter table public.runs enable row level security;

-- Explicit grants (required once Data API auto-expose is off).
grant select, insert, delete on public.runs to authenticated;
grant all on public.runs to service_role;

create policy "runs_select_own"
  on public.runs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "runs_insert_own"
  on public.runs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "runs_delete_own"
  on public.runs for delete
  to authenticated
  using (auth.uid() = user_id);
