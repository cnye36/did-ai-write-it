"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { FACT_CHECK_MIN_CHARS, FACT_CHECK_MAX_CHARS, type FactCheckResult } from "@/lib/winston";
import type { FactCheckRunResult, RunRow } from "@/lib/runs";
import { Gauge } from "@/components/gauge";
import { FactCheckHighlightedText } from "@/components/fact-check-highlighted-text";
import { FactCheckClaims } from "@/components/fact-check-claims";

interface FactCheckResponse {
  factCheck: FactCheckResult | null;
  runId?: string | null;
  usage: { used: number; limit: number };
}

function factCheckVerdict(score: number): { color: string; label: string } {
  if (score >= 80) return { color: "var(--good)", label: "Well-supported" };
  if (score >= 50) return { color: "var(--warn)", label: "Mixed support" };
  return { color: "var(--bad)", label: "Needs verification" };
}

function resultFromRun(run: RunRow): FactCheckResponse {
  const payload = run.result as FactCheckRunResult;
  return {
    factCheck: payload.factCheck,
    runId: run.id,
    usage: { used: 0, limit: 0 },
  };
}

export function FactCheckPageClient({ initialRun }: { initialRun: RunRow | null }) {
  const router = useRouter();
  const [input, setInput] = useState(initialRun?.input_text ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FactCheckResponse | null>(
    initialRun ? resultFromRun(initialRun) : null
  );
  const [loadedRunId, setLoadedRunId] = useState<string | null>(initialRun?.id ?? null);

  if ((initialRun?.id ?? null) !== loadedRunId) {
    setLoadedRunId(initialRun?.id ?? null);
    if (initialRun) {
      setInput(initialRun.input_text);
      setResult(resultFromRun(initialRun));
      setError(null);
    } else {
      setResult(null);
    }
  }

  const charCount = input.trim().length;
  const canRun = charCount >= FACT_CHECK_MIN_CHARS && charCount <= FACT_CHECK_MAX_CHARS && !busy;
  const showReport = busy || result !== null;

  async function check() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Check failed.");
      const next = data as FactCheckResponse;
      setResult(next);
      if (next.runId) {
        router.replace(`/app/fact-check?run=${next.runId}`);
        setLoadedRunId(next.runId);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  }

  function editText() {
    setResult(null);
    setError(null);
    router.replace("/app/fact-check");
  }

  if (!showReport) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Fact Checker</h1>
          <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-muted">
            Paste any text to verify its factual claims against real sources.
          </p>
        </div>

        <div className="flex flex-col rounded-2xl border border-line bg-raised">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-medium">Your text</span>
            <span className="font-mono text-xs tabular-nums text-faint">
              {charCount.toLocaleString()} / {FACT_CHECK_MAX_CHARS.toLocaleString()} characters
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={12}
            aria-label="Text to fact-check"
            placeholder="Paste the text you want to verify..."
            className="min-h-[260px] flex-1 resize-y bg-transparent p-4 text-sm leading-relaxed outline-none placeholder:text-faint"
          />
          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-line px-4 py-3">
            <button
              type="button"
              disabled={!canRun}
              onClick={check}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MagnifyingGlassIcon size={16} weight="bold" />
              Run fact check
            </button>
          </div>
        </div>

        {error && <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
      </div>
    );
  }

  const factCheck = result?.factCheck ?? null;
  const scoreForDisplay = factCheck?.score ?? 0;
  const verdict = factCheckVerdict(scoreForDisplay);
  const statusCaption = factCheck
    ? `${factCheck.claims.length} claim${factCheck.claims.length === 1 ? "" : "s"} checked`
    : busy
      ? "Checking claims against real sources..."
      : "Fact check unavailable for this text.";

  return (
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-raised px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Gauge score={scoreForDisplay} color={verdict.color} label={verdict.label} size={72} />
          <div>
            <p className="text-sm font-semibold">Fact-check score</p>
            <p className="mt-0.5 text-xs text-faint">{statusCaption}</p>
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={editText}
          className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-faint disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PencilSimpleIcon size={16} weight="bold" />
          Edit text
        </button>
      </div>

      {error && <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      {factCheck && factCheck.claims.length > 0 && (
        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-line bg-surface">
            <div className="border-b border-line px-4 py-2.5">
              <span className="text-sm font-medium">Original</span>
            </div>
            <div className="max-h-[65vh] min-h-[300px] flex-1 overflow-y-auto whitespace-pre-wrap p-4 text-sm leading-relaxed text-muted">
              {input}
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-sm font-medium">Highlighted</span>
              <div className="flex items-center gap-2 text-[11px] text-faint">
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ background: "var(--good)" }} />
                  Supported
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ background: "var(--bad)" }} />
                  Refuted
                </span>
              </div>
            </div>
            <div className="max-h-[65vh] min-h-[300px] flex-1 overflow-y-auto p-4">
              <FactCheckHighlightedText text={input} claims={factCheck.claims} />
            </div>
          </div>
        </div>
      )}

      {factCheck && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">Claims</p>
          <FactCheckClaims claims={factCheck.claims} />
        </div>
      )}

      {!factCheck && !busy && (
        <div className="rounded-2xl border border-line bg-surface p-6">
          <p className="text-sm text-muted">
            Fact check unavailable for this text. It may be too short or too long, or the service
            is temporarily unreachable.
          </p>
        </div>
      )}
    </div>
  );
}
