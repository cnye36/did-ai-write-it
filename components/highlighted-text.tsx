"use client";

import type { Flag } from "@/lib/detector";

/*
  Renders text with lexicon/punctuation flags wrapped in <mark>.
  Rhythm flags cover whole sentence runs, so they are listed separately
  by the parent rather than highlighted inline.
*/
export function HighlightedText({ text, flags }: { text: string; flags: Flag[] }) {
  const inline = flags
    .filter((f) => f.category !== "rhythm" && f.end > f.start)
    .sort((a, b) => a.start - b.start);

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  inline.forEach((f, i) => {
    if (f.start < cursor) return; // skip overlapping flags
    if (f.start > cursor) parts.push(text.slice(cursor, f.start));
    parts.push(
      <mark key={i} data-flag title={f.reason}>
        {text.slice(f.start, f.end)}
      </mark>
    );
    cursor = f.end;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <div className="whitespace-pre-wrap leading-relaxed">{parts}</div>;
}
