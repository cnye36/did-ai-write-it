"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileMagnifyingGlassIcon,
  ClipboardTextIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { Gauge } from "@/components/gauge";
import { PlagiarismSources } from "@/components/plagiarism-sources";
import { FactCheckClaims } from "@/components/fact-check-claims";
import { QuotaExceededModal } from "@/components/quota-exceeded-modal";
import { plagiarismVerdict, factCheckVerdict } from "@/lib/score-verdicts";
import {
  PLAGIARISM_MIN_CHARS,
  PLAGIARISM_MAX_CHARS,
  FACT_CHECK_MIN_CHARS,
  FACT_CHECK_MAX_CHARS,
  type PlagiarismResult,
  type FactCheckResult,
} from "@/lib/winston";

/** Optional, user-triggered plagiarism and fact-check add-ons for a text
 * that's already been through the AI detector, run inline on the same page
 * rather than sending the user off to a separate tool. */
export function DetectorAddons({ text }: { text: string }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <PlagiarismAddon text={text} />
      <FactCheckAddon text={text} />
    </div>
  );
}

function PlagiarismAddon({ text }: { text: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ plan: string; limit: number } | null>(null);
  const [result, setResult] = useState<PlagiarismResult | null | undefined>(undefined);
  const [runId, setRunId] = useState<string | null>(null);

  const charCount = text.trim().length;
  const eligible = charCount >= PLAGIARISM_MIN_CHARS && charCount <= PLAGIARISM_MAX_CHARS;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/plagiarism", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setQuota({ plan: data.plan, limit: data.limit });
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Check failed.");
      setResult(data.plagiarism as PlagiarismResult | null);
      setRunId((data.runId as string | null | undefined) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  }

  const quotaModal = (
    <QuotaExceededModal
      open={quota !== null}
      onClose={() => setQuota(null)}
      plan={quota?.plan ?? "free"}
      limit={quota?.limit ?? 0}
    />
  );

  if (result === undefined) {
    return (
      <>
        <AddonCard
          icon={<FileMagnifyingGlassIcon size={18} weight="bold" />}
          title="Plagiarism check"
          description="Scan this text against the web for matching content."
          busy={busy}
          error={error}
          disabled={!eligible}
          onRun={run}
        />
        {quotaModal}
      </>
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

function FactCheckAddon({ text }: { text: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ plan: string; limit: number } | null>(null);
  const [result, setResult] = useState<FactCheckResult | null | undefined>(undefined);
  const [runId, setRunId] = useState<string | null>(null);

  const charCount = text.trim().length;
  const eligible = charCount >= FACT_CHECK_MIN_CHARS && charCount <= FACT_CHECK_MAX_CHARS;

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setQuota({ plan: data.plan, limit: data.limit });
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Check failed.");
      setResult(data.factCheck as FactCheckResult | null);
      setRunId((data.runId as string | null | undefined) ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  }

  const quotaModal = (
    <QuotaExceededModal
      open={quota !== null}
      onClose={() => setQuota(null)}
      plan={quota?.plan ?? "free"}
      limit={quota?.limit ?? 0}
    />
  );

  if (result === undefined) {
    return (
      <>
        <AddonCard
          icon={<ClipboardTextIcon size={18} weight="bold" />}
          title="Fact check"
          description={
            eligible
              ? "Verify factual claims in this text against real sources."
              : `Needs ${FACT_CHECK_MIN_CHARS.toLocaleString()}-${FACT_CHECK_MAX_CHARS.toLocaleString()} characters (this text is ${charCount.toLocaleString()}).`
          }
          busy={busy}
          error={error}
          disabled={!eligible}
          onRun={run}
        />
        {quotaModal}
      </>
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
