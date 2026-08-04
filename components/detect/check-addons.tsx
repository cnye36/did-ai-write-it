"use client";

import Link from "next/link";
import {
  FileMagnifyingGlassIcon,
  ClipboardTextIcon,
  SparkleIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { Gauge } from "@/components/ui/gauge";
import { PlagiarismSources } from "@/components/plagiarism/plagiarism-sources";
import { FactCheckClaims } from "@/components/fact-check/fact-check-claims";
import { plagiarismVerdict, factCheckVerdict } from "@/lib/score-verdicts";
import { verdictFor, type Verdict } from "@/lib/detector";
import type { PlagiarismResult, FactCheckResult } from "@/lib/winston";
import type { WinstonSentence } from "@/components/detect/winston-sentence-list";

/** One add-on's state, owned by the parent so the same check can be kicked
 *  off either up front (bundled with the page's own primary check) or on
 *  demand afterward, from a single source of truth. `result` is `undefined`
 *  until run, `null` if it ran but came back unavailable. */
export interface AddonState<T> {
  busy: boolean;
  error: string | null;
  result: T | null | undefined;
  runId: string | null;
}

interface AddonProps<T> extends AddonState<T> {
  eligible: boolean;
  ineligibleReason: string;
  onRun: () => void;
}

export interface DetectAddonResult {
  score: number;
  sentences: WinstonSentence[];
}

const DETECT_VERDICT_COLOR: Record<Verdict, string> = {
  human: "var(--good)",
  mixed: "var(--warn)",
  ai: "var(--bad)",
};
const DETECT_VERDICT_LABEL: Record<Verdict, string> = {
  human: "Reads human",
  mixed: "Borderline",
  ai: "Reads AI",
};

/** Any of the three checks, run inline as a compact add-on card wherever it
 * isn't the page's own primary check. Fully controlled: the parent owns
 * state and fetching, so a check can be pre-selected and kicked off
 * alongside the primary one, or triggered manually afterward. */
export function DetectAddonCard({ busy, error, result, runId, eligible, ineligibleReason, onRun }: AddonProps<DetectAddonResult>) {
  if (result === undefined) {
    return (
      <AddonCard
        icon={<SparkleIcon size={18} weight="bold" />}
        title="AI detection"
        description={eligible ? "Run a verified AI-detection score on this text." : ineligibleReason}
        busy={busy}
        error={error}
        disabled={!eligible}
        onRun={onRun}
      />
    );
  }

  if (result === null) {
    return (
      <AddonResultCard icon={<SparkleIcon size={18} weight="bold" />} title="AI detection" caption="Unavailable for this text." />
    );
  }

  const verdict = verdictFor(result.score);
  return (
    <AddonResultCard
      icon={<SparkleIcon size={18} weight="bold" />}
      title="AI detection"
      gauge={<Gauge score={result.score} color={DETECT_VERDICT_COLOR[verdict]} label={DETECT_VERDICT_LABEL[verdict]} size={56} />}
      caption={`${result.sentences.length} sentence${result.sentences.length === 1 ? "" : "s"} scored`}
      href={runId ? `/app/detect?run=${runId}` : "/app/detect"}
    />
  );
}

export function PlagiarismAddonCard({ busy, error, result, runId, eligible, ineligibleReason, onRun }: AddonProps<PlagiarismResult>) {
  if (result === undefined) {
    return (
      <AddonCard
        icon={<FileMagnifyingGlassIcon size={18} weight="bold" />}
        title="Plagiarism check"
        description={eligible ? "Scan this text against the web for matching content." : ineligibleReason}
        busy={busy}
        error={error}
        disabled={!eligible}
        onRun={onRun}
      />
    );
  }

  if (result === null) {
    return (
      <AddonResultCard
        icon={<FileMagnifyingGlassIcon size={18} weight="bold" />}
        title="Plagiarism check"
        caption="Unavailable for this text."
      />
    );
  }

  const verdict = plagiarismVerdict(result.score);
  return (
    <AddonResultCard
      icon={<FileMagnifyingGlassIcon size={18} weight="bold" />}
      title="Plagiarism check"
      gauge={<Gauge score={result.score} color={verdict.color} label={verdict.label} size={56} />}
      caption={`${result.totalPlagiarismWords.toLocaleString()} of ${result.textWordCount.toLocaleString()} words matched`}
      href={runId ? `/app/plagiarism?run=${runId}` : "/app/plagiarism"}
    >
      {result.sources.length > 0 && <PlagiarismSources sources={result.sources.slice(0, 3)} />}
    </AddonResultCard>
  );
}

export function FactCheckAddonCard({ busy, error, result, runId, eligible, ineligibleReason, onRun }: AddonProps<FactCheckResult>) {
  if (result === undefined) {
    return (
      <AddonCard
        icon={<ClipboardTextIcon size={18} weight="bold" />}
        title="Fact check"
        description={eligible ? "Verify factual claims in this text against real sources." : ineligibleReason}
        busy={busy}
        error={error}
        disabled={!eligible}
        onRun={onRun}
      />
    );
  }

  if (result === null) {
    return (
      <AddonResultCard
        icon={<ClipboardTextIcon size={18} weight="bold" />}
        title="Fact check"
        caption="Unavailable for this text."
      />
    );
  }

  const verdict = factCheckVerdict(result.score);
  return (
    <AddonResultCard
      icon={<ClipboardTextIcon size={18} weight="bold" />}
      title="Fact check"
      gauge={<Gauge score={result.score} color={verdict.color} label={verdict.label} size={56} />}
      caption={`${result.claims.length} claim${result.claims.length === 1 ? "" : "s"} checked`}
      href={runId ? `/app/fact-check?run=${runId}` : "/app/fact-check"}
    >
      {result.claims.length > 0 && <FactCheckClaims claims={result.claims.slice(0, 2)} />}
    </AddonResultCard>
  );
}

function AddonCard({
  icon,
  title,
  description,
  busy,
  error,
  disabled,
  onRun,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  busy: boolean;
  error: string | null;
  disabled: boolean;
  onRun: () => void;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center gap-2 text-sm font-medium">
        <span className="text-faint">{icon}</span>
        {title}
      </div>
      <p className="mt-1 flex-1 text-xs leading-relaxed text-faint">{description}</p>
      {error && <p className="mt-2 text-xs text-bad">{error}</p>}
      <button
        type="button"
        disabled={disabled || busy}
        onClick={onRun}
        className="mt-3 inline-flex items-center justify-center gap-1.5 self-start rounded-full border border-line px-3.5 py-1.5 text-xs font-medium text-ink transition-colors hover:border-faint disabled:cursor-not-allowed disabled:opacity-40"
      >
        {busy ? "Checking..." : "Run check"}
      </button>
    </div>
  );
}

function AddonResultCard({
  icon,
  title,
  caption,
  gauge,
  href,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  caption: string;
  gauge?: React.ReactNode;
  href?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-line bg-surface p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="text-faint">{icon}</span>
          {title}
        </div>
        {href && (
          <Link
            href={href}
            className="inline-flex items-center gap-0.5 text-xs font-medium text-accent hover:underline"
          >
            Full report
            <CaretRightIcon size={11} weight="bold" />
          </Link>
        )}
      </div>
      {gauge ? (
        <div className="mt-3 flex items-center gap-3">
          {gauge}
          <p className="text-xs leading-relaxed text-faint">{caption}</p>
        </div>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-faint">{caption}</p>
      )}
      {children && <div className="mt-3 border-t border-line pt-3">{children}</div>}
    </div>
  );
}
