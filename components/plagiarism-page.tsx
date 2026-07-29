"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { PLAGIARISM_MIN_CHARS, PLAGIARISM_MAX_CHARS, type PlagiarismResult } from "@/lib/winston";
import { plagiarismVerdict } from "@/lib/score-verdicts";
import type { PlagiarismRunResult, RunRow } from "@/lib/runs";
import { Gauge } from "@/components/gauge";
import { PlagiarismHighlightedText } from "@/components/plagiarism-highlighted-text";
import { PlagiarismSources } from "@/components/plagiarism-sources";
import { QuotaExceededModal } from "@/components/quota-exceeded-modal";

interface PlagiarismResponse {
  plagiarism: PlagiarismResult | null;
  runId?: string | null;
  usage: { used: number; limit: number };
}

function resultFromRun(run: RunRow): PlagiarismResponse {
  const payload = run.result as PlagiarismRunResult;
  return {
    plagiarism: payload.plagiarism,
    runId: run.id,
    usage: { used: 0, limit: 0 },
  };
}

export function PlagiarismPageClient({ initialRun }: { initialRun: RunRow | null }) {
  const router = useRouter();
  const [input, setInput] = useState(initialRun?.input_text ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ plan: string; limit: number } | null>(null);
  const [result, setResult] = useState<PlagiarismResponse | null>(
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
  const canRun = charCount >= PLAGIARISM_MIN_CHARS && charCount <= PLAGIARISM_MAX_CHARS && !busy;
  const showReport = busy || result !== null;

  async function check() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/plagiarism", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setQuota({ plan: data.plan, limit: data.limit });
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Check failed.");
      const next = data as PlagiarismResponse;
      setResult(next);
      if (next.runId) {
        router.replace(`/app/plagiarism?run=${next.runId}`);
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
    router.replace("/app/plagiarism");
  }

  function newCheck() {
    setInput("");
    setResult(null);
    setError(null);
    setLoadedRunId(null);
    router.replace("/app/plagiarism");
  }

  if (!showReport) {
    return (
      <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Plagiarism Checker</h1>
            <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-muted">
              Paste any text to scan it against the web for matching content.
            </p>
          </div>
          <button
            type="button"
            onClick={newCheck}
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-faint"
          >
            <PlusIcon size={16} weight="bold" />
            New
          </button>
        </div>

        <div className="flex flex-col rounded-2xl border border-line bg-raised">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-medium">Your text</span>
            <span className="font-mono text-xs tabular-nums text-faint">
              {charCount.toLocaleString()} / {PLAGIARISM_MAX_CHARS.toLocaleString()} characters
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={12}
            aria-label="Text to check for plagiarism"
            placeholder="Paste the text you want to scan..."
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
              Run plagiarism check
            </button>
          </div>
        </div>

        {error && <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}
      </div>
      <QuotaExceededModal
        open={quota !== null}
        onClose={() => setQuota(null)}
        plan={quota?.plan ?? "free"}
        limit={quota?.limit ?? 0}
      />
      </>
    );
  }

  const plagiarism = result?.plagiarism ?? null;
  const scoreForDisplay = plagiarism?.score ?? 0;
  const verdict = plagiarismVerdict(scoreForDisplay);
  const statusCaption = plagiarism
    ? `${plagiarism.totalPlagiarismWords.toLocaleString()} of ${plagiarism.textWordCount.toLocaleString()} words matched · ${plagiarism.sources.length} source${plagiarism.sources.length === 1 ? "" : "s"}`
    : busy
      ? "Scanning the web for matches..."
      : "Plagiarism check unavailable for this text.";

  return (
    <>
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-raised px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <Gauge score={scoreForDisplay} color={verdict.color} label={verdict.label} size={72} />
          <div>
            <p className="text-sm font-semibold">Plagiarism score</p>
            <p className="mt-0.5 text-xs text-faint">{statusCaption}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={newCheck}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-faint disabled:cursor-not-allowed disabled:opacity-40"
          >
            <PlusIcon size={16} weight="bold" />
            New
          </button>
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
      </div>

      {error && <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      {plagiarism && (
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
              <span className="inline-flex items-center gap-1 text-[11px] text-faint">
                <span className="size-2 rounded-full" style={{ background: "var(--bad)" }} />
                Matched
              </span>
            </div>
            <div className="max-h-[65vh] min-h-[300px] flex-1 overflow-y-auto p-4">
              <PlagiarismHighlightedText text={input} matches={plagiarism.matches} />
            </div>
          </div>
        </div>
      )}

      {plagiarism && plagiarism.sources.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">Matched sources</p>
          <PlagiarismSources sources={plagiarism.sources} />
        </div>
      )}

      {!plagiarism && !busy && (
        <div className="rounded-2xl border border-line bg-surface p-6">
          <p className="text-sm text-muted">
            Plagiarism check unavailable for this text. It may be too short, or the service is
            temporarily unreachable.
          </p>
        </div>
      )}
    </div>
    <QuotaExceededModal
      open={quota !== null}
      onClose={() => setQuota(null)}
      plan={quota?.plan ?? "free"}
      limit={quota?.limit ?? 0}
    />
    </>
  );
}
