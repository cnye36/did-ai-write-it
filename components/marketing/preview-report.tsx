"use client";

import Link from "next/link";
import { ArrowRightIcon, CheckIcon, LockSimpleIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { verdictFor } from "@/lib/detector";
import { locateWinstonSentences } from "@/lib/winston-sentences";
import { DetectionVerdict } from "@/components/detect/detection-verdict";
import { WinstonHighlightedText } from "@/components/detect/winston-highlighted-text";
import {
  ScoreBadge,
  WinstonSentenceList,
  type WinstonSentence,
} from "@/components/detect/winston-sentence-list";

/**
 * /api/preview-detect already decides, server-side, exactly how much to
 * reveal (through the Nth flagged sentence plus one more for the teaser, or a
 * short prefix when nothing's flagged) so the full result never round-trips
 * to an anonymous client. This component trusts that and just renders it.
 */
const UNLOCKS = [
  "Every sentence analyzed, not just the first few",
  "Plagiarism and fact checks on the same text",
  "Longer checks, saved reports, and rewrites",
];

/** Shown instead of UNLOCKS when the visible result reads as human: there's
 *  nothing flagged to entice with, so the pitch is proof and portability
 *  instead, both real, shipped features, not a claim this "certifies" anything. */
const HUMAN_READ_POINTS = [
  "This exact result is saved to your account, timestamped and unchanged",
  "Get a shareable link so anyone can see the report for themselves",
  "Free to keep checking as you write",
];

const LEGEND = [
  { label: "Likely AI", color: "var(--bad)" },
  { label: "Mixed", color: "var(--warn)" },
  { label: "Human", color: "var(--good)" },
];

export interface PreviewResult {
  score: number;
  sentences: WinstonSentence[];
  /** Total sentences in the underlying report when only a subset was returned. */
  totalSentenceCount?: number;
}

/**
 * The anonymous check's result: the submitted text with its first few scored
 * sentences highlighted inline, the rest blurred behind a signup CTA. Shared by
 * the homepage hero and the public tool pages so both gate identically.
 */
export function PreviewReport({
  text,
  busy,
  preview,
  ctaHref,
  onSignup,
}: {
  text: string;
  busy: boolean;
  preview: PreviewResult | null;
  ctaHref: string;
  onSignup?: () => void;
}) {
  const located = locateWinstonSentences(text, preview?.sentences ?? []);
  const totalCount = preview?.totalSentenceCount ?? preview?.sentences.length ?? 0;
  const hasMoreHidden = totalCount > located.length;
  const lastReceivedIsFlagged =
    located.length > 0 && verdictFor(located[located.length - 1].score) !== "human";
  // The strongest reason to sign up is a flag they can see we caught, so when
  // the server sent one extra sentence past the reveal target, hold it back
  // as a locked teaser row (real score, blurred sentence) instead of showing
  // it inline like the rest of `shown`.
  const teaser = hasMoreHidden && lastReceivedIsFlagged ? located[located.length - 1] : undefined;
  const shown = teaser ? located.slice(0, -1) : located;
  const cutoff = shown.length > 0 ? shown[shown.length - 1].end : text.length;
  const revealedText = text.slice(0, cutoff);
  const hiddenText = text.slice(cutoff);
  const hiddenSentences = Math.max(0, totalCount - shown.length);
  const overallHuman = preview !== null && verdictFor(preview.score) === "human";

  return (
    <div className="grid max-h-[85vh] grid-cols-1 sm:grid-cols-[1.3fr_1fr]">
      <div className="max-h-[40vh] overflow-y-auto border-b border-line p-5 sm:max-h-[85vh] sm:border-b-0 sm:border-r">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-faint">Your text</p>
          {shown.length > 0 && (
            <div className="flex items-center gap-3">
              {LEGEND.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-1.5 text-[11px] text-faint">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ background: item.color }}
                    aria-hidden
                  />
                  {item.label}
                </span>
              ))}
            </div>
          )}
        </div>

        {shown.length > 0 ? (
          <WinstonHighlightedText text={revealedText} sentences={shown} showHuman />
        ) : (
          <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{revealedText}</div>
        )}

        {hiddenText.trim() && (
          <div className="relative mt-1 max-h-44 overflow-hidden">
            <p
              aria-hidden
              className="select-none whitespace-pre-wrap text-sm leading-relaxed text-muted blur-[3px]"
            >
              {hiddenText}
            </p>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-raised" />
          </div>
        )}
      </div>

      {/* Capped so the two stacked panes still fit the modal on mobile, and the
          CTA below stays pinned instead of scrolling out of view. */}
      <div className="flex max-h-[45vh] flex-col p-5 sm:max-h-[85vh]">
        <p className="mb-4 shrink-0 text-xs font-medium uppercase tracking-wide text-faint">
          Result
        </p>
        {busy ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-4 animate-pulse rounded bg-line"
                style={{ width: `${80 - i * 10}%` }}
              />
            ))}
          </div>
        ) : preview ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-col items-start gap-1">
                <DetectionVerdict score={preview.score} />
                <span className="text-[11px] text-faint">Verified detector result</span>
              </div>

              {shown.length > 0 && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
                    First {shown.length} sentence{shown.length > 1 ? "s" : ""}
                  </p>
                  <WinstonSentenceList sentences={shown} />
                </div>
              )}

              {teaser && (
                <div className="mt-4">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-faint">
                    Flagged further down
                  </p>
                  <div className="flex items-start gap-3 rounded-[10px] border border-line bg-surface p-3 text-sm">
                    <ScoreBadge score={teaser.score} />
                    <span
                      aria-hidden
                      className="line-clamp-2 select-none leading-relaxed text-muted blur-[3px]"
                    >
                      {teaser.text}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 shrink-0 rounded-2xl border border-line bg-surface p-4">
              <p className="flex items-center gap-2 text-sm font-medium text-ink">
                {overallHuman ? (
                  <>
                    <ShareNetworkIcon size={16} weight="bold" className="shrink-0 text-accent" />
                    Reads as human
                  </>
                ) : (
                  <>
                    <LockSimpleIcon size={16} weight="bold" className="shrink-0 text-accent" />
                    {hiddenSentences > 0
                      ? `${hiddenSentences} more analyzed sentence${hiddenSentences > 1 ? "s" : ""} locked`
                      : "Your full report is ready"}
                  </>
                )}
              </p>
              <ul className="mt-2 space-y-1">
                {(overallHuman ? HUMAN_READ_POINTS : UNLOCKS).map((item) => (
                  <li key={item} className="flex items-start gap-1.5 text-[11px] leading-snug text-muted">
                    <CheckIcon size={12} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                    {item}
                  </li>
                ))}
              </ul>
              <Link
                href={ctaHref}
                onClick={onSignup}
                className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
              >
                {overallHuman ? "Sign up free to save this report" : "Sign up free to unlock"}{" "}
                <ArrowRightIcon size={14} weight="bold" />
              </Link>
              <p className="mt-1.5 text-center text-[11px] text-faint">
                Free account, no card needed.
              </p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted">
            Check unavailable for this text right now. Try again shortly.
          </p>
        )}
      </div>
    </div>
  );
}
