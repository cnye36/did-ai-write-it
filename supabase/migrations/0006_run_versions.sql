-- Versioned reports within a single run, so a manual rescan from the new
-- "Fix" editor extends the existing sidebar entry instead of creating a new
-- one. The parent runs row mirrors the latest version (title and created_at
-- stay frozen at the original; updated_at tracks the latest rescan so the
-- sidebar's relative time doesn't look permanently stale).

alter table public.runs
  add column updated_at timestamptz not null default now();

update public.runs set updated_at = created_at;

-- 0004_runs.sql never granted update or added an update policy, so without
-- this, appendRunVersion's update to the parent row would silently affect 0
-- rows under RLS.
grant update on public.runs to authenticated;

create policy "runs_update_own"
  on public.runs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table public.run_versions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.runs (id) on delete cascade,
  input_text text not null,
  word_count integer not null default 0 check (word_count >= 0),
  score integer check (score is null or (score >= 0 and score <= 100)),
  result jsonb not null,
  created_at timestamptz not null default now()
);

create index run_versions_run_created_idx on public.run_versions (run_id, created_at);

alter table public.run_versions enable row level security;

grant select, insert on public.run_versions to authenticated;
grant all on public.run_versions to service_role;

-- No parent user_id column here, so ownership is checked via the parent run.
-- Append-only for v1: no update or delete policy.
create policy "run_versions_select_own"
  on public.run_versions for select
  to authenticated
  using (
    exists (
      select 1 from public.runs r
      where r.id = run_versions.run_id and r.user_id = auth.uid()
    )
  );

create policy "run_versions_insert_own"
  on public.run_versions for insert
  to authenticated
  with check (
    exists (
      select 1 from public.runs r
      where r.id = run_versions.run_id and r.user_id = auth.uid()
    )
  );
