"use client";

import Link from "next/link";
import { LockSimpleIcon } from "@phosphor-icons/react";
import { verdictFor } from "@/lib/detector";

export interface WinstonSentence {
  text: string;
  score: number;
}

function flaggedIndexes(sentences: WinstonSentence[]): number[] {
  return sentences.reduce<number[]>((acc, s, i) => {
    if (verdictFor(s.score) !== "human") acc.push(i);
    return acc;
  }, []);
}

/**
 * List of Winston-scored sentences with score-colored badges. With
 * `revealCount` + `ctaHref`, everything after the `revealCount`-th flagged
 * sentence renders blurred behind a signup CTA instead (same reveal-cutoff
 * idea as detection-report.tsx's DetectionReportBody, reimplemented here
 * since Winston's sentences have no character offsets into the original
 * text and so can't reuse that component's inline-highlight approach).
 */
export function WinstonSentenceList({
  sentences,
  revealCount,
  ctaHref,
}: {
  sentences: WinstonSentence[];
  revealCount?: number;
  ctaHref?: string;
}) {
  if (sentences.length === 0) return null;

  const flagged = flaggedIndexes(sentences);
  const cutoffIndex =
    revealCount !== undefined ? flagged[revealCount - 1] : undefined;
  const revealUpToIndex = cutoffIndex !== undefined ? cutoffIndex : sentences.length - 1;
  const hiddenCount = Math.max(0, sentences.length - 1 - revealUpToIndex);

  return (
    <>
      <ul className="space-y-2">
        {sentences.map((s, i) => {
          if (i > revealUpToIndex) return null;
          const v = verdictFor(s.score);
          return (
            <li key={i} className="flex items-start gap-3 text-sm">
              <span
                className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 font-mono text-xs tabular-nums"
                style={{
                  background:
                    v === "human" ? "var(--good-soft)" : v === "mixed" ? "var(--warn-soft)" : "var(--bad-soft)",
                  color: v === "human" ? "var(--good)" : v === "mixed" ? "var(--warn)" : "var(--bad)",
                }}
              >
                {s.score}
              </span>
              <span className="leading-relaxed text-muted">{s.text}</span>
            </li>
          );
        })}
      </ul>
      {hiddenCount > 0 && ctaHref && (
        <div className="mt-4 flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-surface p-4 text-center">
          <span className="inline-flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
            <LockSimpleIcon size={18} weight="bold" />
          </span>
          <p className="text-sm text-muted">
            {hiddenCount} more sentence{hiddenCount > 1 ? "s" : ""} hidden.
          </p>
          <Link
            href={ctaHref}
            className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-ink transition-transform active:scale-[0.97]"
          >
            Sign up to view the full report
          </Link>
        </div>
      )}
    </>
  );
}
