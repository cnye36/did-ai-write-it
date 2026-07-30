"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { analyzeText, verdictFor } from "@/lib/detector";
import { useHandoffInput } from "@/lib/handoff";
import type { DetectRunResult, RunRow } from "@/lib/runs";
import {
  PLAGIARISM_MIN_CHARS,
  PLAGIARISM_MAX_CHARS,
  FACT_CHECK_MIN_CHARS,
  FACT_CHECK_MAX_CHARS,
  type PlagiarismResult,
  type FactCheckResult,
} from "@/lib/winston";
import { ScoreGauge } from "@/components/score-gauge";
import { DetectionReportBody } from "@/components/detection-report";
import { WinstonHighlightedText } from "@/components/winston-highlighted-text";
import { DetectionSignals } from "@/components/detection-signals";
import { PlagiarismAddonCard, FactCheckAddonCard, type AddonState } from "@/components/check-addons";
import { QuotaExceededModal } from "@/components/quota-exceeded-modal";
import { UploadTextButton } from "@/components/upload-text-button";
import type { WinstonSentence } from "@/components/winston-sentence-list";

interface DetectResponse {
  winston: { score: number; sentences: WinstonSentence[] } | null;
  runId?: string | null;
  usage: { used: number; limit: number };
}

const EMPTY_ADDON: AddonState<never> = { busy: false, error: null, result: undefined, runId: null };

function resultFromRun(run: RunRow): DetectResponse {
  const payload = run.result as DetectRunResult;
  return {
    winston: payload.winston,
    runId: run.id,
    usage: { used: 0, limit: 0 },
  };
}

export function DetectPageClient({ initialRun }: { initialRun: RunRow | null }) {
  const router = useRouter();
  const [input, setInput] = useHandoffInput(initialRun?.input_text ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ plan: string; limit: number } | null>(null);
  const [result, setResult] = useState<DetectResponse | null>(
    initialRun ? resultFromRun(initialRun) : null
  );
  const [loadedRunId, setLoadedRunId] = useState<string | null>(initialRun?.id ?? null);

  const [wantPlagiarism, setWantPlagiarism] = useState(false);
  const [wantFactCheck, setWantFactCheck] = useState(false);
  const [plagiarism, setPlagiarism] = useState<AddonState<PlagiarismResult>>(EMPTY_ADDON);
  const [factCheck, setFactCheck] = useState<AddonState<FactCheckResult>>(EMPTY_ADDON);

  // Sidebar navigation passes a new initialRun; sync during render (no effect).
  if ((initialRun?.id ?? null) !== loadedRunId) {
    setLoadedRunId(initialRun?.id ?? null);
    setPlagiarism(EMPTY_ADDON);
    setFactCheck(EMPTY_ADDON);
    if (initialRun) {
      setInput(initialRun.input_text);
      setResult(resultFromRun(initialRun));
      setError(null);
    } else {
      setResult(null);
    }
  }

  const live = useMemo(() => analyzeText(input), [input]);
  const canRun = live.wordCount >= 15 && !busy;
  const showReport = busy || result !== null;

  const charCount = input.trim().length;
  const plagiarismEligible = charCount >= PLAGIARISM_MIN_CHARS && charCount <= PLAGIARISM_MAX_CHARS;
  const factCheckEligible = charCount >= FACT_CHECK_MIN_CHARS && charCount <= FACT_CHECK_MAX_CHARS;
  const plagiarismIneligibleReason = `Needs ${PLAGIARISM_MIN_CHARS.toLocaleString()}-${PLAGIARISM_MAX_CHARS.toLocaleString()} characters (this text is ${charCount.toLocaleString()}).`;
  const factCheckIneligibleReason = `Needs ${FACT_CHECK_MIN_CHARS.toLocaleString()}-${FACT_CHECK_MAX_CHARS.toLocaleString()} characters (this text is ${charCount.toLocaleString()}).`;

  async function runDetect() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/detect", {
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
      const next = data as DetectResponse;
      setResult(next);
      if (next.runId) {
        router.replace(`/app/detect?run=${next.runId}`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  }

  async function runPlagiarism() {
    setPlagiarism((s) => ({ ...s, busy: true, error: null }));
    try {
      const res = await fetch("/api/plagiarism", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setQuota({ plan: data.plan, limit: data.limit });
        setPlagiarism((s) => ({ ...s, busy: false }));
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Check failed.");
      setPlagiarism({
        busy: false,
        error: null,
        result: data.plagiarism as PlagiarismResult | null,
        runId: (data.runId as string | null | undefined) ?? null,
      });
    } catch (e) {
      setPlagiarism((s) => ({ ...s, busy: false, error: e instanceof Error ? e.message : "Check failed." }));
    }
  }

  async function runFactCheck() {
    setFactCheck((s) => ({ ...s, busy: true, error: null }));
    try {
      const res = await fetch("/api/fact-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setQuota({ plan: data.plan, limit: data.limit });
        setFactCheck((s) => ({ ...s, busy: false }));
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Check failed.");
      setFactCheck({
        busy: false,
        error: null,
        result: data.factCheck as FactCheckResult | null,
        runId: (data.runId as string | null | undefined) ?? null,
      });
    } catch (e) {
      setFactCheck((s) => ({ ...s, busy: false, error: e instanceof Error ? e.message : "Check failed." }));
    }
  }

  function analyze() {
    void runDetect();
    if (wantPlagiarism && plagiarismEligible) void runPlagiarism();
    if (wantFactCheck && factCheckEligible) void runFactCheck();
  }

  function editText() {
    setResult(null);
    setError(null);
    setPlagiarism(EMPTY_ADDON);
    setFactCheck(EMPTY_ADDON);
    router.replace("/app/detect");
  }

  function newCheck() {
    setInput("");
    setResult(null);
    setError(null);
    setWantPlagiarism(false);
    setWantFactCheck(false);
    setPlagiarism(EMPTY_ADDON);
    setFactCheck(EMPTY_ADDON);
    router.replace("/app/detect");
  }

  if (!showReport) {
    return (
      <>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AI Detector</h1>
            <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-muted">
              Paste any text to get an instant free AI score, then verify it
              against a real third-party detector.
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
            <div className="flex items-center gap-3">
              <UploadTextButton onText={setInput} onError={setError} />
              <span className="font-mono text-xs tabular-nums text-faint">
                {live.wordCount} words
                {live.wordCount >= 15 && ` · ${live.score}/100 human (quick estimate)`}
              </span>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={12}
            aria-label="Text to check for AI"
            placeholder="Paste the text you want to check..."
            className="min-h-[260px] flex-1 resize-y bg-transparent p-4 text-sm leading-relaxed outline-none placeholder:text-faint"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <div className="flex flex-wrap items-center gap-4">
              <label
                className={`inline-flex items-center gap-2 text-sm ${plagiarismEligible ? "text-muted" : "text-faint"}`}
              >
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={wantPlagiarism}
                  disabled={!plagiarismEligible}
                  onChange={(e) => setWantPlagiarism(e.target.checked)}
                />
                Also check plagiarism
              </label>
              <label
                className={`inline-flex items-center gap-2 text-sm ${factCheckEligible ? "text-muted" : "text-faint"}`}
              >
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={wantFactCheck}
                  disabled={!factCheckEligible}
                  onChange={(e) => setWantFactCheck(e.target.checked)}
                />
                Also check facts
              </label>
            </div>
            <button
              type="button"
              disabled={!canRun}
              onClick={analyze}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <MagnifyingGlassIcon size={16} weight="bold" />
              Analyze
            </button>
          </div>
        </div>

        {error && <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

        {live.wordCount >= 15 && (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">
              Line-by-line report
            </p>
            <DetectionReportBody text={input} result={live} />
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

  const verified = result?.winston ?? null;
  const scoreForDisplay = verified ? verified.score : live.score;
  const verdictForDisplay = verdictFor(scoreForDisplay);
  const statusLabel = verified ? "Verified score" : "Quick estimate";
  const statusCaption = verified
    ? `${live.wordCount || initialRun?.word_count || 0} words`
    : busy
      ? `${live.wordCount} words · verifying with a real detector...`
      : `${live.wordCount} words · real-detector check unavailable, showing quick estimate`;

  const addonsActive =
    plagiarism.result !== undefined ||
    plagiarism.busy ||
    plagiarism.error !== null ||
    factCheck.result !== undefined ||
    factCheck.busy ||
    factCheck.error !== null;
  const showAddons = verified !== null || addonsActive;

  return (
    <>
    <div className="space-y-4">
      <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-line bg-raised px-5 py-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-4">
          <ScoreGauge score={scoreForDisplay} verdict={verdictForDisplay} size={72} />
          <div>
            <p className="text-sm font-semibold">{statusLabel}</p>
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

      {showAddons && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">Add-on checks</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <PlagiarismAddonCard
              {...plagiarism}
              eligible={plagiarismEligible}
              ineligibleReason={plagiarismIneligibleReason}
              onRun={runPlagiarism}
            />
            <FactCheckAddonCard
              {...factCheck}
              eligible={factCheckEligible}
              ineligibleReason={factCheckIneligibleReason}
              onRun={runFactCheck}
            />
          </div>
        </div>
      )}

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
            <div className="flex items-center gap-3 text-[11px] text-faint">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: "var(--bad)" }} />
                AI-flagged
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full" style={{ background: "var(--warn)" }} />
                Mixed
              </span>
            </div>
          </div>
          <div className="max-h-[65vh] min-h-[300px] flex-1 overflow-y-auto p-4">
            {verified ? (
              <WinstonHighlightedText text={input} sentences={verified.sentences} flags={live.flags} />
            ) : (
              <DetectionReportBody text={input} result={live} />
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-line bg-surface p-4">
        <DetectionSignals text={input} live={live} verified={verified} />
      </div>
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
