"use client";

import { ArrowClockwiseIcon, SparkleIcon } from "@phosphor-icons/react";
import type { DetectionInsight } from "@/lib/detection-insight";

export function DetectionInsightPanel({
  insight,
  busy,
  error,
  onGenerate,
}: {
  insight: DetectionInsight | null;
  busy: boolean;
  error: string | null;
  onGenerate: () => void;
}) {
  return (
    <section className="rounded-2xl border border-line bg-surface p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Writing insights</p>
          <p className="mt-0.5 text-xs leading-relaxed text-faint">
            An independent language review of the passages that stand out.
          </p>
        </div>
        {!insight && !busy && (
          <button
            type="button"
            onClick={onGenerate}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-faint"
          >
            {error ? <ArrowClockwiseIcon size={13} weight="bold" /> : <SparkleIcon size={13} weight="bold" />}
            {error ? "Try again" : "Generate insights"}
          </button>
        )}
      </div>

      {busy ? (
        <div className="mt-4 space-y-3" aria-label="Generating writing insights">
          <div className="h-3 w-11/12 animate-pulse rounded bg-line" />
          <div className="h-3 w-8/12 animate-pulse rounded bg-line" />
          <div className="h-16 animate-pulse rounded-[10px] bg-raised" />
          <div className="h-16 animate-pulse rounded-[10px] bg-raised" />
        </div>
      ) : insight ? (
        <div className="mt-4">
          <p className="text-sm leading-relaxed text-muted">{insight.summary}</p>
          <ul className="mt-4 space-y-3">
            {insight.observations.map((observation, index) => (
              <li key={`${observation.excerpt}-${index}`} className="rounded-[10px] bg-raised p-3">
                <blockquote className="text-sm leading-relaxed text-ink">
                  “{observation.excerpt}”
                </blockquote>
                <p className="mt-2 text-xs leading-relaxed text-muted">{observation.explanation}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] leading-relaxed text-faint">
            These observations explain visible writing patterns. They are not proof of authorship
            or the detector&apos;s private reasoning.
          </p>
        </div>
      ) : error ? (
        <p className="mt-3 rounded-[10px] bg-bad-soft px-3 py-2 text-xs text-bad">{error}</p>
      ) : (
        <p className="mt-4 text-sm leading-relaxed text-muted">
          Generate a grounded review of the wording, structure, and cadence behind this result.
        </p>
      )}
    </section>
  );
}
