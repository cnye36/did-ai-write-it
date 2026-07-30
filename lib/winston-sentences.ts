/*
  Locating Winston's sentences in the original text, and anchoring live scores
  to them.

  Winston returns per-sentence scores but no character offsets, and its own
  sentence split doesn't line up with lib/detector.ts's. Everything here works
  around that by locating each sentence with a sequential substring search.

  The anchoring half exists because our heuristic is a weak predictor of
  Winston (see the penalty-only rework in lib/detector.ts). Wherever a sentence
  is unchanged since the last real scan we already have Winston's actual score
  for it, so we use that and only fall back to the heuristic for text the user
  has actually edited. At the start of an edit session that's ground truth for
  the whole document, degrading only as they type.
*/

import { analyzeText, reasonsForRange, verdictFor, type Verdict } from "./detector";

export interface WinstonSentenceScore {
  text: string;
  score: number;
}

export interface LocatedWinstonSentence {
  text: string;
  start: number;
  end: number;
  score: number;
}

export function locateWinstonSentences(
  text: string,
  sentences: WinstonSentenceScore[]
): LocatedWinstonSentence[] {
  const located: LocatedWinstonSentence[] = [];
  let cursor = 0;
  for (const s of sentences) {
    const needle = s.text.trim();
    if (!needle) continue;
    const idx = text.indexOf(needle, cursor);
    if (idx === -1) continue; // rare split mismatch: skip rather than error
    located.push({ text: needle, start: idx, end: idx + needle.length, score: s.score });
    cursor = idx + needle.length;
  }
  return located;
}

export interface ResolvedSentence {
  text: string;
  start: number;
  end: number;
  score: number;
  verdict: Verdict;
  reasons: string[];
  /** "verified" = Winston's own score for text the user hasn't touched. */
  source: "verified" | "estimated";
}

/** Collapse whitespace so re-wrapping alone doesn't count as an edit. */
function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Per-sentence scores for the current draft, preferring Winston's real score
 * for any sentence still present unchanged from the last scan and falling back
 * to the heuristic for edited or newly typed text.
 */
export function resolveSentenceScores(
  draft: string,
  winstonSentences: WinstonSentenceScore[] | null | undefined
): ResolvedSentence[] {
  const live = analyzeText(draft);

  const verified = new Map<string, number>();
  for (const s of winstonSentences ?? []) {
    const key = normalize(s.text);
    if (key) verified.set(key, s.score);
  }

  return live.sentences.map((s) => {
    const match = verified.get(normalize(s.text));
    if (match === undefined) {
      return { ...s, source: "estimated" as const };
    }
    return {
      text: s.text,
      start: s.start,
      end: s.end,
      score: match,
      verdict: verdictFor(match),
      // Winston never explains a score, so any reason shown is still our own
      // pattern scan laid over its sentence range.
      reasons: reasonsForRange(live.flags, s.start, s.end),
      source: "verified" as const,
    };
  });
}

/** How much of the draft still carries a real Winston score. */
export function verifiedCoverage(resolved: ResolvedSentence[]): {
  verified: number;
  total: number;
} {
  return {
    verified: resolved.filter((s) => s.source === "verified").length,
    total: resolved.length,
  };
}
