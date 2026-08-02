"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import {
  PLAGIARISM_MIN_CHARS,
  PLAGIARISM_MAX_CHARS,
  WINSTON_MIN_CHARS,
  DETECT_MAX_CHARS,
  FACT_CHECK_MIN_CHARS,
  FACT_CHECK_MAX_CHARS,
  type PlagiarismResult,
  type FactCheckResult,
} from "@/lib/winston";
import { plagiarismVerdict } from "@/lib/score-verdicts";
import type { PlagiarismRunResult, RunRow } from "@/lib/runs";
import { Gauge } from "@/components/ui/gauge";
import { PlagiarismHighlightedText } from "@/components/plagiarism/plagiarism-highlighted-text";
import { PlagiarismSources } from "@/components/plagiarism/plagiarism-sources";
import { QuotaExceededModal } from "@/components/ui/quota-exceeded-modal";
import { DetectAddonCard, FactCheckAddonCard, type AddonState, type DetectAddonResult } from "@/components/detect/check-addons";
import { UploadTextButton } from "@/components/editor/upload-text-button";
import { useHandoffInput } from "@/lib/handoff";

interface PlagiarismResponse {
  plagiarism: PlagiarismResult | null;
  runId?: string | null;
  usage: { used: number; limit: number };
}

const EMPTY_ADDON: AddonState<never> = { busy: false, error: null, result: undefined, runId: null };

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
  const searchParams = useSearchParams();
  const autoRun = searchParams.get("autorun") === "1";
  const autoRunStarted = useRef(false);
  const [input, setInput] = useHandoffInput(initialRun?.input_text ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ plan: string; limit: number } | null>(null);
  const [result, setResult] = useState<PlagiarismResponse | null>(
    initialRun ? resultFromRun(initialRun) : null
  );
  const [loadedRunId, setLoadedRunId] = useState<string | null>(initialRun?.id ?? null);

  const [wantDetect, setWantDetect] = useState(false);
  const [wantFactCheck, setWantFactCheck] = useState(false);
  const [detectAddon, setDetectAddon] = useState<AddonState<DetectAddonResult>>(EMPTY_ADDON);
  const [factCheck, setFactCheck] = useState<AddonState<FactCheckResult>>(EMPTY_ADDON);

  if ((initialRun?.id ?? null) !== loadedRunId) {
    setLoadedRunId(initialRun?.id ?? null);
    setDetectAddon(EMPTY_ADDON);
    setFactCheck(EMPTY_ADDON);
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

  const detectEligible = charCount >= WINSTON_MIN_CHARS && charCount <= DETECT_MAX_CHARS;
  const factCheckEligible = charCount >= FACT_CHECK_MIN_CHARS && charCount <= FACT_CHECK_MAX_CHARS;
  const detectIneligibleReason = `Needs ${WINSTON_MIN_CHARS.toLocaleString()}-${DETECT_MAX_CHARS.toLocaleString()} characters (this text is ${charCount.toLocaleString()}).`;
  const factCheckIneligibleReason = `Needs ${FACT_CHECK_MIN_CHARS.toLocaleString()}-${FACT_CHECK_MAX_CHARS.toLocaleString()} characters (this text is ${charCount.toLocaleString()}).`;

  async function runDetectAddon() {
    setDetectAddon((s) => ({ ...s, busy: true, error: null }));
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setQuota({ plan: data.plan, limit: data.limit });
        setDetectAddon((s) => ({ ...s, busy: false }));
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Check failed.");
      setDetectAddon({
        busy: false,
        error: null,
        result: data.winston as DetectAddonResult | null,
        runId: (data.runId as string | null | undefined) ?? null,
      });
    } catch (e) {
      setDetectAddon((s) => ({ ...s, busy: false, error: e instanceof Error ? e.message : "Check failed." }));
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
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  }

  function analyze() {
    void check();
    if (wantDetect && detectEligible) void runDetectAddon();
    if (wantFactCheck && factCheckEligible) void runFactCheck();
  }

  useEffect(() => {
    if (!autoRun || autoRunStarted.current || !canRun) return;
    autoRunStarted.current = true;
    router.replace("/app/plagiarism");
    void check();
  }, [autoRun, canRun, input, router, check]);

  function editText() {
    setResult(null);
    setError(null);
    setDetectAddon(EMPTY_ADDON);
    setFactCheck(EMPTY_ADDON);
    router.replace("/app/plagiarism");
  }

  function newCheck() {
    setInput("");
    setResult(null);
    setError(null);
    setWantDetect(false);
    setWantFactCheck(false);
    setDetectAddon(EMPTY_ADDON);
    setFactCheck(EMPTY_ADDON);
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
            <div className="flex items-center gap-3">
              <UploadTextButton onText={setInput} onError={setError} />
              <span className="font-mono text-xs tabular-nums text-faint">
                {charCount.toLocaleString()} / {PLAGIARISM_MAX_CHARS.toLocaleString()} characters
              </span>
            </div>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={12}
            aria-label="Text to check for plagiarism"
            placeholder="Paste the text you want to scan..."
            className="min-h-[260px] flex-1 resize-y bg-transparent p-4 text-sm leading-relaxed outline-none placeholder:text-faint"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            <div className="flex flex-wrap items-center gap-4">
              <label
                className={`inline-flex items-center gap-2 text-sm ${detectEligible ? "text-muted" : "text-faint"}`}
              >
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={wantDetect}
                  disabled={!detectEligible}
                  onChange={(e) => setWantDetect(e.target.checked)}
                />
                Also check for AI
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

  const addonsActive =
    detectAddon.result !== undefined ||
    detectAddon.busy ||
    detectAddon.error !== null ||
    factCheck.result !== undefined ||
    factCheck.busy ||
    factCheck.error !== null;
  const showAddons = plagiarism !== null || addonsActive;

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

      {showAddons && (
        <div>
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">Add-on checks</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <DetectAddonCard
              {...detectAddon}
              eligible={detectEligible}
              ineligibleReason={detectIneligibleReason}
              onRun={runDetectAddon}
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
