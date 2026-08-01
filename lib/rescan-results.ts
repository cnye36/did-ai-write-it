/*
  What actually happened in a rescan: for every sentence that changed between
  the previous saved version and the new one, who wrote it (lib/provenance.ts)
  and whether Winston's real score for it went up or down.

  Old/new scores are looked up via resolveSentenceScores rather than matching
  raw Winston sentences directly, because diffText (lib/diff.ts) and
  resolveSentenceScores both split on lib/detector.ts's splitSentences over
  the SAME version text, so their sentence boundaries line up exactly; Winston's
  own sentence list is coarser (see lib/winston-sentences.ts) and would need
  the same containment matching resolveSentenceScores already does, so this
  reuses it instead of duplicating it.
*/

import { diffText } from "./diff";
import { normalize, resolveSentenceScores } from "./winston-sentences";
import type { ProvenanceMap, ProvenanceSource } from "./provenance";
import type { DetectRunResult, RunVersion } from "./runs";

export interface RescanChange {
  text: string;
  source: ProvenanceSource | "unknown";
  oldScore: number | null;
  newScore: number | null;
  /** newScore - oldScore; null when there's no comparable prior score
   *  (a pure addition, or the old/new sentence was never Winston-verified). */
  delta: number | null;
}

export interface RescanSourceSummary {
  improved: number;
  worsened: number;
  unchanged: number;
}

export interface RescanResults {
  changes: RescanChange[];
  bySource: Record<ProvenanceSource | "unknown", RescanSourceSummary>;
}

function winstonOf(v: RunVersion): DetectRunResult["winston"] | null {
  const result = v.result as Partial<DetectRunResult>;
  return result.winston ?? null;
}

/** Normalized sentence text -> Winston's real score, for whichever of this
 *  version's own sentences it actually verified. */
function scoreMap(version: RunVersion): Map<string, number> {
  const winston = winstonOf(version);
  const resolved = resolveSentenceScores(version.input_text, winston?.sentences ?? null);
  const map = new Map<string, number>();
  for (const s of resolved) {
    if (s.source === "verified") map.set(normalize(s.text), s.score);
  }
  return map;
}

export function buildRescanResults(
  previous: RunVersion,
  next: RunVersion,
  provenance: ProvenanceMap
): RescanResults {
  const oldScores = scoreMap(previous);
  const newScores = scoreMap(next);
  const { entries } = diffText(previous.input_text, next.input_text);

  const changes: RescanChange[] = [];
  for (const entry of entries) {
    if (entry.kind !== "changed" && entry.kind !== "added") continue;
    const after = entry.after ?? "";
    const afterKey = normalize(after);
    const source = provenance.get(afterKey) ?? "unknown";
    const newScore = newScores.get(afterKey) ?? null;
    const oldScore = entry.kind === "changed" ? (oldScores.get(normalize(entry.before ?? "")) ?? null) : null;
    const delta = oldScore !== null && newScore !== null ? newScore - oldScore : null;
    changes.push({ text: after, source, oldScore, newScore, delta });
  }

  const bySource: RescanResults["bySource"] = {
    ai: { improved: 0, worsened: 0, unchanged: 0 },
    user: { improved: 0, worsened: 0, unchanged: 0 },
    unknown: { improved: 0, worsened: 0, unchanged: 0 },
  };
  for (const c of changes) {
    if (c.delta === null) continue;
    const bucket = bySource[c.source];
    if (c.delta > 0) bucket.improved++;
    else if (c.delta < 0) bucket.worsened++;
    else bucket.unchanged++;
  }

  return { changes, bySource };
}
