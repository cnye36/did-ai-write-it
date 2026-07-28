"use client";

import { verdictFor } from "@/lib/detector";
import type { WinstonSentence } from "./winston-sentence-list";

interface Segment {
  text: string;
  score?: number;
}

/**
 * Winston's sentences carry no character offsets into the original text
 * (unlike lib/detector.ts's own sentence splitter), so this locates each one
 * by sequential substring search instead, letting the verified result reuse
 * the same inline-highlight treatment as the free heuristic's report.
 */
function buildSegments(text: string, sentences: WinstonSentence[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const s of sentences) {
    const needle = s.text.trim();
    if (!needle) continue;
    const idx = text.indexOf(needle, cursor);
    if (idx === -1) continue;
    if (idx > cursor) segments.push({ text: text.slice(cursor, idx) });
    segments.push({ text: needle, score: s.score });
    cursor = idx + needle.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

/** Original text with each Winston-flagged sentence marked, reasons on hover. */
export function WinstonHighlightedText({
  text,
  sentences,
}: {
  text: string;
  sentences: WinstonSentence[];
}) {
  const segments = buildSegments(text, sentences);

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.score === undefined) return <span key={i}>{seg.text}</span>;
        const verdict = verdictFor(seg.score);
        if (verdict === "human") return <span key={i}>{seg.text}</span>;
        return (
          <mark key={i} data-severity={verdict} title={`${seg.score}/100 human`}>
            {seg.text}
          </mark>
        );
      })}
    </div>
  );
}
