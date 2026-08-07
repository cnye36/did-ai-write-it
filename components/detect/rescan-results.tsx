"use client";

import { XIcon } from "@phosphor-icons/react";
import { detectionPresentation, detectionTransition } from "@/lib/detection-presentation";
import type { RescanResults } from "@/lib/rescan-results";

const SOURCE_LABEL: Record<string, string> = { ai: "AI rewrite", user: "You", unknown: "Edited" };
const SOURCE_COLOR: Record<string, string> = {
  ai: "var(--warn)",
  user: "var(--accent)",
  unknown: "var(--faint)",
};

function ResultChange({
  oldScore,
  newScore,
}: {
  oldScore: number | null;
  newScore: number | null;
}) {
  if (newScore === null) return <span className="text-xs text-faint">Not scored</span>;
  if (oldScore === null) {
    return <span className="text-xs text-faint">{detectionPresentation(newScore).signal}</span>;
  }
  return <span className="text-xs text-faint">{detectionTransition(oldScore, newScore)}</span>;
}

/** What actually happened in the rescan just run: every changed sentence,
 *  tagged with who wrote it and how its detector classification changed.
 *  Renders nothing when nothing changed since the last scan. */
export function RescanResultsPanel({
  results,
  onDismiss,
}: {
  results: RescanResults;
  onDismiss: () => void;
}) {
  const { changes, bySource } = results;
  if (changes.length === 0) return null;

  const summaryParts: string[] = [];
  for (const key of ["ai", "user"] as const) {
    const s = bySource[key];
    if (s.improved + s.worsened === 0) continue;
    const label = key === "ai" ? "AI rewrite" : "your edit";
    const bits: string[] = [];
    if (s.improved) bits.push(`${s.improved} ${label}${s.improved > 1 ? "s" : ""} improved it`);
    if (s.worsened) bits.push(`${s.worsened} made it worse`);
    summaryParts.push(bits.join(", "));
  }

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-faint">
          What changed this rescan ({changes.length})
        </p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 rounded-full p-1 text-faint transition-colors hover:text-ink"
        >
          <XIcon size={14} weight="bold" />
        </button>
      </div>
      {summaryParts.length > 0 && <p className="mt-2 text-sm text-muted">{summaryParts.join(" · ")}</p>}
      <ul className="mt-3 space-y-2">
        {changes.map((c, i) => (
          <li
            key={i}
            className="flex items-start justify-between gap-3 rounded-[10px] border border-line p-3"
          >
            <div className="min-w-0">
              <p className="text-sm leading-relaxed">{c.text}</p>
              <span
                className="mt-1 inline-block text-[11px] font-medium"
                style={{ color: SOURCE_COLOR[c.source] }}
              >
                {SOURCE_LABEL[c.source]}
              </span>
            </div>
            <div className="shrink-0 text-right">
              <ResultChange oldScore={c.oldScore} newScore={c.newScore} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
