"use client";

import { ArrowRightIcon } from "@phosphor-icons/react";
import type { SentenceReportRow } from "@/lib/sentence-report";
import { detectionPresentation } from "@/lib/detection-presentation";
import {
  DetectionTechnicalDetails,
  DetectionVerdict,
} from "@/components/detect/detection-verdict";

const WORST_SENTENCE_COUNT = 5;

/** The report's right rail: a plain-language result, optional technical
 * details, and a preview of the strongest AI-associated sentence signals. */
export function ReportSidebar({
  score,
  sentences,
}: {
  score: number | null;
  sentences: SentenceReportRow[];
}) {
  const worst = sentences
    .map((s, i) => ({ ...s, index: i }))
    .filter((sentence) => sentence.verdict !== "human")
    .sort((a, b) => a.score - b.score)
    .slice(0, WORST_SENTENCE_COUNT);

  return (
    <div className="space-y-5">
      <div>
        {score !== null ? (
          <DetectionVerdict score={score} compact />
        ) : (
          <div className="size-14 shrink-0 animate-pulse rounded-full bg-surface" aria-hidden />
        )}
      </div>

      {score !== null && <DetectionTechnicalDetails score={score} />}

      {worst.length > 0 && (
        <div className="border-t border-line pt-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-xs font-medium uppercase tracking-wide text-faint">
              Strongest AI signals
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
                      className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                        s.verdict === "human"
                          ? "bg-good-soft text-good"
                          : s.verdict === "mixed"
                            ? "bg-warn-soft text-warn"
                            : "bg-bad-soft text-bad"
                      }`}
                    >
                      {detectionPresentation(s.score).signal}
                    </span>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
