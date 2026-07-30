-- Rich-text document alongside the plain text.
--
-- input_text stays the canonical plain-text projection: it is what Winston
-- scores, what lib/detector.ts analyses, and what every existing read path
-- expects. `doc` is the ProseMirror JSON the editor round-trips so formatting
-- (bold, headings, lists) survives a reload or a version switch.
--
-- Nullable on purpose: every row written before the rich editor shipped has no
-- doc, and the editor falls back to building one from input_text.

alter table public.runs
  add column doc jsonb;

alter table public.run_versions
  add column doc jsonb;
