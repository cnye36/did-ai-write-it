"use client";

import { formatRunDateTime, type RunVersion } from "@/lib/runs";

/** "Report 1 / Report 2 / ..." pill row shared by the main report page and the
 *  Fix editor, so a run's rescan history reads the same way in both places.
 *  The first report is always tagged "Original" since it's the one saved
 *  before any rescan, giving users an always-visible way back to it. */
export function VersionTabs({
  versions,
  selectedIndex,
  onSelect,
}: {
  versions: RunVersion[];
  selectedIndex: number;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {versions.map((v, i) => (
        <button
          key={v.id}
          type="button"
          onClick={() => onSelect(i)}
          title={formatRunDateTime(v.created_at)}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            i === selectedIndex
              ? "border-accent bg-accent-soft text-accent"
              : "border-line text-muted hover:border-faint"
          }`}
        >
          Report {i + 1}
          {i === 0 && <span className="text-faint"> (Original)</span>}
          {v.score != null && <span> · {v.score}</span>}
          <span className="text-faint"> · {formatRunDateTime(v.created_at)}</span>
        </button>
      ))}
    </div>
  );
}
