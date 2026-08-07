"use client";

import { verdictFor } from "@/lib/detector";
import { detectionPresentation } from "@/lib/detection-presentation";
import { locateWinstonSentences } from "@/lib/winston-sentences";
import type { WinstonSentence } from "./winston-sentence-list";

// Re-exported for the components that already import it from here. The
// implementation moved to lib/winston-sentences.ts so non-client code can use
// it too (it is pure logic, and this file is a "use client" module).
export { locateWinstonSentences };
export type { LocatedWinstonSentence } from "@/lib/winston-sentences";

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
 * Original text with each Winston-scored sentence marked. With `showHuman`,
 * passing sentences get a green underline too, so a reader
 * fixing a draft can tell "already fine" apart from "not scored". Off by
 * default: on a clean document it would mark essentially every sentence.
 */
export function WinstonHighlightedText({
  text,
  sentences,
  showHuman = false,
}: {
  text: string;
  sentences: WinstonSentence[];
  showHuman?: boolean;
}) {
  const segments = buildSegments(text, sentences);

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {segments.map((seg, i) => {
        if (seg.score === undefined) return <span key={i}>{seg.text}</span>;
        const verdict = verdictFor(seg.score);
        if (verdict === "human" && !showHuman) return <span key={i}>{seg.text}</span>;
        return (
          <mark key={i} data-severity={verdict} title={detectionPresentation(seg.score).signal}>
            {seg.text}
          </mark>
        );
      })}
    </div>
  );
}
