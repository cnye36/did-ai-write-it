"use client";

import type { PlagiarismMatch } from "@/lib/winston";

/** Original text with every matched span marked, reusing the same red
 * mark[data-severity="ai"] treatment as AI-flagged sentences elsewhere. */
export function PlagiarismHighlightedText({
  text,
  matches,
}: {
  text: string;
  matches: PlagiarismMatch[];
}) {
  const sorted = [...matches].sort((a, b) => a.startIndex - b.startIndex);

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  sorted.forEach((m, i) => {
    if (m.startIndex < cursor || m.endIndex <= m.startIndex) return; // skip overlapping/invalid spans
    if (m.startIndex > cursor) parts.push(text.slice(cursor, m.startIndex));
    parts.push(
      <mark key={i} data-severity="ai" title="Matched against an existing source">
        {text.slice(m.startIndex, m.endIndex)}
      </mark>
    );
    cursor = m.endIndex;
  });
  if (cursor < text.length) parts.push(text.slice(cursor));

  return <div className="whitespace-pre-wrap text-sm leading-relaxed">{parts}</div>;
}
