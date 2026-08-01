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
export function normalize(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/**
 * Per-sentence scores for the current draft, preferring Winston's real score
 * for any sentence still present unchanged from the last scan and falling back
 * to the heuristic for edited or newly typed text.
 *
 * Winston's own sentence split is coarser than ours: it frequently merges
 * several of our sentences into one scored chunk (short fragments with a
 * neighbor, sometimes across a paragraph break), so a byte-for-byte match
 * against a single Winston sentence fails constantly even when nothing was
 * edited. Matching by containment (is this sentence a substring of some
 * Winston chunk?), scanning forward through the chunks in document order,
 * fixes that without needing to replicate Winston's undocumented merging
 * rules: it still requires literal, un-reworded text, so an actual edit still
 * correctly falls back to "estimated".
 */
export function resolveSentenceScores(
  draft: string,
  winstonSentences: WinstonSentenceScore[] | null | undefined
): ResolvedSentence[] {
  const live = analyzeText(draft);

  const chunks = (winstonSentences ?? [])
    .map((s) => ({ text: normalize(s.text), score: s.score }))
    .filter((c) => c.text.length > 0);

  let cursor = 0;

  return live.sentences.map((s) => {
    const key = normalize(s.text);

    // Search forward from the last matched chunk (never backward, so a
    // short phrase that recurs later in the document can't steal an
    // earlier sentence's match) without consuming chunks that turn out
    // unmatched, since one chunk can cover several of our sentences in a row.
    let matchIndex = -1;
    for (let i = cursor; i < chunks.length; i++) {
      if (chunks[i].text.includes(key)) {
        matchIndex = i;
        break;
      }
    }

    if (matchIndex === -1) {
      return { ...s, source: "estimated" as const };
    }
    cursor = matchIndex;
    const match = chunks[matchIndex].score;

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
