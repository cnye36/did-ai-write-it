/*
  Who wrote each sentence in a live draft: the AI (accepted suggestion /
  "rewrite entire draft") or the user, typing by hand. Keyed by normalized
  sentence text rather than character position, same reasoning as
  lib/winston-sentences.ts's resolveSentenceScores: edits elsewhere in the
  document shift positions but leave a given sentence's own text alone, so
  content-based keys survive unrelated edits that position-based ones would not.

  This is deliberately not persisted: it only needs to last for the current
  editing session (it drives the editor's live highlighting and feeds
  lib/rescan-results.ts right after a rescan), not across a page reload.
*/

import { diffText } from "./diff";
import { normalize } from "./winston-sentences";

export type ProvenanceSource = "ai" | "user";

export type ProvenanceMap = Map<string, ProvenanceSource>;

export function emptyProvenance(): ProvenanceMap {
  return new Map();
}

/** Diffs `before` against `after` and marks every added/changed sentence's
 *  new text as written by `source`, returning a new map (previous entries for
 *  sentences that still exist are kept as-is). */
export function recordProvenance(
  map: ProvenanceMap,
  before: string,
  after: string,
  source: ProvenanceSource
): ProvenanceMap {
  const { entries } = diffText(before, after);
  const next = new Map(map);
  for (const entry of entries) {
    if ((entry.kind === "added" || entry.kind === "changed") && entry.after) {
      next.set(normalize(entry.after), source);
    }
  }
  return next;
}
