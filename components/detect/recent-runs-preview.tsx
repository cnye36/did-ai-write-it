"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ClockCounterClockwiseIcon } from "@phosphor-icons/react";
import { detectionPresentation } from "@/lib/detection-presentation";
import { formatRunDateTime, type RunListItem } from "@/lib/runs";

const RECENT_COUNT = 5;

/** Inline preview of the user's recent AI-detection checks, shown on the
 * blank compose screen so a first-time or returning user has something to
 * click into instead of an empty page below the paste box. The full history
 * (every kind, filterable) lives in the persistent left nav; this is just
 * the detector's own last few, front and center. */
export function RecentRunsPreview() {
  const [runs, setRuns] = useState<RunListItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/runs")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { runs?: RunListItem[] } | null) => {
        if (cancelled || !data?.runs) return;
        setRuns(data.runs.filter((r) => r.kind === "detect").slice(0, RECENT_COUNT));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!runs || runs.length === 0) return null;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-faint">
        <ClockCounterClockwiseIcon size={13} weight="bold" />
        Recent checks
      </p>
      <ul className="divide-y divide-line">
        {runs.map((run) => {
          const presentation = run.score !== null ? detectionPresentation(run.score) : null;
          return (
            <li key={run.id}>
              <Link
                href={`/app/detect?run=${run.id}`}
                className="flex items-center justify-between gap-3 py-2.5 text-sm transition-colors hover:text-accent"
              >
                <span className="min-w-0 flex-1 truncate text-ink">{run.title}</span>
                <span className="flex shrink-0 items-center gap-2">
                  {presentation && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        presentation.verdict === "human"
                          ? "bg-good-soft text-good"
                          : presentation.verdict === "mixed"
                            ? "bg-warn-soft text-warn"
                            : "bg-bad-soft text-bad"
                      }`}
                    >
                      {presentation.signal}
                    </span>
                  )}
                  <span className="text-xs text-faint">{formatRunDateTime(run.created_at)}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
