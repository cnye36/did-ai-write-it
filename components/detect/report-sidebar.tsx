"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import type { Verdict } from "@/lib/detector";
import type { SentenceReportRow } from "@/lib/sentence-report";
import { ScoreGauge } from "@/components/detect/score-gauge";

const VERDICT_CLASSES: Record<Verdict, string> = {
  human: "bg-good-soft text-good",
  mixed: "bg-warn-soft text-warn",
  ai: "bg-bad-soft text-bad",
};

const WORST_SENTENCE_COUNT = 5;

interface Metric {
  id: string;
  label: string;
  score: number;
  detail: string;
}

/** The report's right rail: the score again (small, for at-a-glance context
 * while scrolling the sentence list below), the six signal-score bars, and a
 * preview of the lowest-scoring sentences with a jump link into the full
 * report under the highlighted text. Exists mainly so a short document
 * doesn't leave this column looking half-empty next to a tall main pane. */
export function ReportSidebar({
  score,
  verdict,
  metrics,
  sentences,
}: {
  score: number | null;
  verdict: Verdict | null;
  metrics: Metric[];
  sentences: SentenceReportRow[];
}) {
  const worst = sentences
    .map((s, i) => ({ ...s, index: i }))
    .sort((a, b) => a.score - b.score)
    .slice(0, WORST_SENTENCE_COUNT);

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        {score !== null && verdict !== null ? (
          <ScoreGauge score={score} verdict={verdict} size={56} />
        ) : (
          <div className="size-14 shrink-0 animate-pulse rounded-full bg-surface" aria-hidden />
        )}
        <div>
          <p className="text-sm font-semibold">{score !== null ? `${score}/100` : "Scoring..."}</p>
          <p className="text-xs text-faint">Human-likeness score</p>
        </div>
      </div>

      {metrics.length > 0 && (
        <div className="border-t border-line pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">
            Signal breakdown
          </p>
          <div className="space-y-3">
            {metrics.map((m) => (
              <div key={m.id}>
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink">{m.label}</span>
                  <span className="font-mono tabular-nums text-faint">{m.score}/100</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                  <div
                    className="h-full rounded-full bg-accent"
                    style={{ width: `${Math.max(0, Math.min(100, m.score))}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {worst.length > 0 && (
        <div className="border-t border-line pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-faint">
              Weakest sentences
            </p>
            <a
              href="#sentence-report"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-accent hover:underline"
            >
              See full report
              <ArrowRightIcon size={11} weight="bold" />
            </a>
          </div>
          <ul className="space-y-2">
            {worst.map((s) => (
              <li key={s.index}>
                <a
                  href={`#sentence-${s.index}`}
                  className="block rounded-[10px] border border-line bg-raised p-2.5 transition-colors hover:border-faint"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="line-clamp-2 text-xs leading-relaxed text-ink">{s.text}</p>
                    <span
                      className={`shrink-0 rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${VERDICT_CLASSES[s.verdict]}`}
                    >
                      {s.score}
                    </span>
                  </div>
                  {s.reasons.length > 0 && (
                    <p className="mt-1.5 truncate text-[10px] leading-tight text-faint">
                      {s.reasons.join(", ")}
                    </p>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
