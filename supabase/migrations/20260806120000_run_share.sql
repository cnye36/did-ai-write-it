-- Shareable, read-only report links.
--
-- share_token is a random, unguessable id an owner opts into per run (nullable:
-- null means "not shared"). The public /share/[token] page reads it through the
-- service-role client, the same RLS-bypass pattern preview-detect already uses
-- for anonymous reads, so no anon RLS policy is needed here. The existing
-- runs_update_own policy (0006_run_versions.sql) already covers writes to this
-- column since it's owner-scoped on every column, not just the ones that
-- existed when it was written.

alter table public.runs
  add column share_token uuid unique;

create index runs_share_token_idx on public.runs (share_token) where share_token is not null;
