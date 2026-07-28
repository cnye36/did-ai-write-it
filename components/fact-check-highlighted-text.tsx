"use client";

import type { CSSProperties } from "react";
import type { FactCheckClaim, FactCheckVerdict } from "@/lib/winston";

const VERDICT_STYLE: Record<FactCheckVerdict, { background: string; borderBottom: string }> = {
  SUPPORTED: { background: "var(--good-soft)", borderBottom: "1.5px solid var(--good)" },
  PARTIALLY_SUPPORTED: { background: "var(--warn-soft)", borderBottom: "1.5px solid var(--warn)" },
  NOT_ENOUGH_EVIDENCE: { background: "var(--raised)", borderBottom: "1.5px solid var(--faint)" },
  REFUTED: { background: "var(--bad-soft)", borderBottom: "1.5px solid var(--bad)" },
};

interface Segment {
  text: string;
  claim?: FactCheckClaim;
}

/** Claim sentences carry no character offsets, so locate each one by
 * sequential substring search, same technique as WinstonHighlightedText. */
function buildSegments(text: string, claims: FactCheckClaim[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  for (const claim of claims) {
    const needle = claim.sentence.trim();
    if (!needle) continue;
    const idx = text.indexOf(needle, cursor);
    if (idx === -1) continue;
    if (idx > cursor) segments.push({ text: text.slice(cursor, idx) });
    segments.push({ text: needle, claim });
    cursor = idx + needle.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}

/** Original text with every checked claim's sentence marked, color-coded by verdict. */
export function FactCheckHighlightedText({ text, claims }: { text: string; claims: FactCheckClaim[] }) {
  const segments = buildSegments(text, claims);

  return (
    <div className="whitespace-pre-wrap text-sm leading-relaxed">
      {segments.map((seg, i) => {
        if (!seg.claim) return <span key={i}>{seg.text}</span>;
        const style: CSSProperties = {
          ...VERDICT_STYLE[seg.claim.verdict],
          color: "inherit",
          borderRadius: 2,
          padding: "0 1px",
          cursor: "help",
        };
        return (
          <mark key={i} style={style} title={seg.claim.explanation}>
            {seg.text}
          </mark>
        );
      })}
    </div>
  );
}
