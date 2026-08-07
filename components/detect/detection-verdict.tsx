"use client";

import { CaretDownIcon } from "@phosphor-icons/react";
import { detectionPresentation } from "@/lib/detection-presentation";

const TONE_CLASS = {
  human: "bg-good-soft text-good",
  mixed: "bg-warn-soft text-warn",
  ai: "bg-bad-soft text-bad",
};

export function DetectionVerdict({
  score,
  compact = false,
}: {
  score: number;
  compact?: boolean;
}) {
  const presentation = detectionPresentation(score);

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <span
        className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${TONE_CLASS[presentation.verdict]}`}
      >
        {presentation.signal}
      </span>
      <p className={compact ? "text-sm font-semibold text-ink" : "text-lg font-semibold text-ink"}>
        {presentation.title}
      </p>
      {!compact && (
        <p className="max-w-xl text-sm leading-relaxed text-muted">{presentation.description}</p>
      )}
    </div>
  );
}

export function DetectionTechnicalDetails({ score }: { score: number }) {
  return (
    <details className="group border-t border-line pt-3">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs font-medium text-muted">
        Technical details
        <CaretDownIcon
          size={13}
          weight="bold"
          className="transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="mt-3 rounded-[10px] bg-surface p-3 text-xs leading-relaxed text-muted">
        <p>
          Detector output:{" "}
          <span className="font-mono font-semibold tabular-nums text-ink">{score}/100</span>{" "}
          human likelihood
        </p>
        <p className="mt-1.5">
          This is the detector&apos;s estimate for the document overall. It does not measure what
          percentage of the words were written by AI or by a person.
        </p>
      </div>
    </details>
  );
}
