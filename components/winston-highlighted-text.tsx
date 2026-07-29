"use client";

import { reasonsForRange, verdictFor, type Flag } from "@/lib/detector";
import type { WinstonSentence } from "./winston-sentence-list";

export interface LocatedWinstonSentence {
  text: string;
  start: number;
  end: number;
  score: number;
}

/**
 * Winston's sentences carry no character offsets into the original text
 * (unlike lib/detector.ts's own sentence splitter), so this locates each one
 * by sequential substring search instead, letting callers line Winston's
 * sentences up against a range (e.g. our own heuristic's flags) or reuse the
 * same inline-highlight treatment as the free heuristic's report. Sentences
 * that can't be found (rare split mismatches) are skipped silently rather
 * than erroring.
 */
export function locateWinstonSentences(
  text: string,
  sentences: WinstonSentence[]
): LocatedWinstonSentence[] {
  const located: LocatedWinstonSentence[] = [];
  let cursor = 0;
  for (const s of sentences) {
    const needle = s.text.trim();
    if (!needle) continue;
    const idx = text.indexOf(needle, cursor);
    if (idx === -1) continue;
    located.push({ text: needle, start: idx, end: idx + needle.length, score: s.score });
    cursor = idx + needle.length;
  }
  return located;
}

interface Segment {
  text: string;
  start: number;
  end: number;
  score?: number;
}

function buildSegments(text: string, sentences: WinstonSentence[]): Segment[] {
  const located = locateWinstonSentences(text, sentences);
  const segments: Segment[] = [];
  let cursor = 0;
  for (const s of located) {
    if (s.start > cursor) segments.push({ text: text.slice(cursor, s.start), start: cursor, end: s.start });
    segments.push({ text: s.text, start: s.start, end: s.end, score: s.score });
    cursor = s.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), start: cursor, end: text.length });
  return segments;
}

/**
 * Original text with each Winston-flagged sentence marked. `flags`, when
 * given, are our own heuristic's pattern matches (lib/detector.ts) laid over
 * Winston's sentence ranges so the hover tooltip can name a likely reason,
 * since Winston itself returns a score only, never an explanation.
 */
export function WinstonHighlightedText({
  text,
  sentences,
  flags,
}: {
  text: string;
  sentences: WinstonSentence[];
  flags?: Flag[];
}) {
  const segments = buildSegments(text, sentences);

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.score === undefined) return <span key={i}>{seg.text}</span>;
        const verdict = verdictFor(seg.score);
        if (verdict === "human") return <span key={i}>{seg.text}</span>;
        const reasons = flags ? reasonsForRange(flags, seg.start, seg.end) : [];
        const title =
          reasons.length > 0
            ? `${seg.score}/100 human · likely reason: ${reasons.join("; ")}`
            : `${seg.score}/100 human`;
        return (
          <mark key={i} data-severity={verdict} title={title}>
            {seg.text}
          </mark>
        );
      })}
    </div>
  );
}
