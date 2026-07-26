-- Anonymous homepage Winston preview: one row per successful check, used to
-- enforce a per-IP daily rate limit in app/api/preview-detect/route.ts.
-- Run once in the Supabase SQL editor, after 0001 and 0002.

create table public.preview_checks (
  id bigint generated always as identity primary key,
  ip text not null,
  created_at timestamptz not null default now()
);

create index preview_checks_ip_created_at_idx on public.preview_checks (ip, created_at);

alter table public.preview_checks enable row level security;

-- No policies: only the service-role client (lib/supabase/service.ts) reads/writes this table.
