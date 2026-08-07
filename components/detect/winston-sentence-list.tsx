"use client";

import { verdictFor } from "@/lib/detector";
import { detectionPresentation } from "@/lib/detection-presentation";

export interface WinstonSentence {
  text: string;
  score: number;
}

/** A sentence's detector direction, shared by revealed and locked teaser rows. */
export function ScoreBadge({ score }: { score: number }) {
  const v = verdictFor(score);
  return (
    <span
      className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold"
      style={{
        background:
          v === "human" ? "var(--good-soft)" : v === "mixed" ? "var(--warn-soft)" : "var(--bad-soft)",
        color: v === "human" ? "var(--good)" : v === "mixed" ? "var(--warn)" : "var(--bad)",
      }}
    >
      {detectionPresentation(score).signal}
    </span>
  );
}

/**
 * List of Winston-scored sentences with direction badges. Callers decide
 * how many sentences to pass; the signup gate around the withheld ones lives
 * in the caller (components/marketing/preview-report.tsx).
 */
export function WinstonSentenceList({ sentences }: { sentences: WinstonSentence[] }) {
  if (sentences.length === 0) return null;

  return (
    <ul className="space-y-2">
      {sentences.map((s, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <ScoreBadge score={s.score} />
          <span className="leading-relaxed text-muted">{s.text}</span>
        </li>
      ))}
    </ul>
  );
}
