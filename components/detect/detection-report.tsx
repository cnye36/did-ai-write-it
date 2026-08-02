"use client";

import Link from "next/link";
import { LockSimpleIcon } from "@phosphor-icons/react";
import type { DetectorResult } from "@/lib/detector";

interface FreePreview {
  revealCount: number;
  ctaHref: string;
}

function flaggedIndexes(result: DetectorResult): number[] {
  return result.sentences.reduce<number[]>((acc, s, i) => {
    if (s.verdict !== "human") acc.push(i);
    return acc;
  }, []);
}

/** How many flagged sentences are hidden behind a given `revealCount`. */
export function countHiddenFlagged(result: DetectorResult, revealCount: number): number {
  return Math.max(0, flaggedIndexes(result).length - revealCount);
}

/**
 * Just the highlighted text, no card wrapper or CTA: the original text with
 * each flagged sentence marked (reasons in a tooltip). With `freePreview`,
 * everything after the `revealCount`-th flagged sentence is blurred instead.
 */
export function DetectionReportBody({
  text,
  result,
  freePreview,
}: {
  text: string;
  result: DetectorResult;
  freePreview?: FreePreview;
}) {
  if (result.sentences.length === 0) return null;

  const flagged = flaggedIndexes(result);
  const revealCount = freePreview?.revealCount ?? Infinity;
  const cutoffIndex = flagged[revealCount - 1];
  const revealUpToIndex = cutoffIndex !== undefined ? cutoffIndex : result.sentences.length - 1;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  result.sentences.forEach((s, i) => {
    if (s.start > cursor) parts.push(text.slice(cursor, s.start));
    const locked = i > revealUpToIndex;
    if (locked) {
      parts.push(
        <span key={i} className="opacity-50 blur-[3px] select-none" aria-hidden>
          {s.text}
        </span>
      );
    } else if (s.verdict !== "human") {
      parts.push(
        <mark key={i} data-severity={s.verdict} title={s.reasons.join(" ")}>
          {s.text}
        </mark>
      );
    } else {
      parts.push(s.text);
    }
    cursor = s.end;
  });
  if (revealUpToIndex >= result.sentences.length - 1 && cursor < text.length) {
    parts.push(text.slice(cursor));
  }

  return <div className="whitespace-pre-wrap text-sm leading-relaxed">{parts}</div>;
}

/** Self-contained line-by-line report: card wrapper, label, and its own signup CTA. */
export function DetectionReport({
  text,
  result,
  freePreview,
}: {
  text: string;
  result: DetectorResult;
  freePreview?: FreePreview;
}) {
  if (result.sentences.length === 0) return null;
  const hiddenCount = freePreview ? countHiddenFlagged(result, freePreview.revealCount) : 0;

  return (
    <div className="rounded-2xl border border-line bg-surface p-4">
      <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">
        Line-by-line report
      </p>
      <DetectionReportBody text={text} result={result} freePreview={freePreview} />
      {freePreview && hiddenCount > 0 && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-raised p-4 text-center">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
            <LockSimpleIcon size={18} weight="bold" />
          </span>
          <p className="text-sm text-muted">
            {hiddenCount} more flagged sentence{hiddenCount > 1 ? "s" : ""} hidden.
          </p>
          <Link
            href={freePreview.ctaHref}
            className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-ink transition-transform active:scale-[0.97]"
          >
            Sign up free to see the full report
          </Link>
        </div>
      )}
    </div>
  );
}
