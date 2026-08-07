"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { GitDiffIcon, MagnifyingGlassIcon, PencilSimpleIcon, PlusIcon, WrenchIcon } from "@phosphor-icons/react";
import { analyzeText } from "@/lib/detector";
import { useHandoffInput } from "@/lib/handoff";
import type { DetectRunResult, RunRow, RunVersion } from "@/lib/runs";
import {
  PLAGIARISM_MIN_CHARS,
  PLAGIARISM_MAX_CHARS,
  FACT_CHECK_MIN_CHARS,
  FACT_CHECK_MAX_CHARS,
  MIN_WORDS_FOR_CHECK,
  WORD_COUNT_HELP_TEXT,
  type PlagiarismResult,
  type FactCheckResult,
} from "@/lib/winston";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import { DetectionVerdict } from "@/components/detect/detection-verdict";
import { DetectionInsightPanel } from "@/components/detect/detection-insight-panel";
import { WinstonHighlightedText } from "@/components/detect/winston-highlighted-text";
import { DetectionSignals } from "@/components/detect/detection-signals";
import { ReportSidebar } from "@/components/detect/report-sidebar";
import { RecentRunsPreview } from "@/components/detect/recent-runs-preview";
import { buildSentenceReport } from "@/lib/sentence-report";
import { PlagiarismAddonButton, FactCheckAddonButton, type AddonState } from "@/components/detect/check-addons";
import { QuotaExceededModal } from "@/components/ui/quota-exceeded-modal";
import { UploadTextButton } from "@/components/editor/upload-text-button";
import type { WinstonSentence } from "@/components/detect/winston-sentence-list";
import { VersionTabs } from "@/components/detect/version-tabs";
import { VersionDiffModal, type DiffFromOption } from "@/components/detect/version-diff-modal";
import { ShareReportButton } from "@/components/share/share-report-modal";
import type { DetectionInsight } from "@/lib/detection-insight";
import posthog from "posthog-js";

interface DetectResponse {
  winston: { score: number; sentences: WinstonSentence[] } | null;
  runId?: string | null;
  versionId?: string | null;
  insight?: DetectionInsight;
  usage: { used: number; limit: number };
}

const EMPTY_ADDON: AddonState<never> = { busy: false, error: null, result: undefined, runId: null };

function resultFromRun(run: RunRow): DetectResponse {
  const payload = run.result as DetectRunResult;
  return {
    winston: payload.winston,
    runId: run.id,
    insight: payload.insight,
    usage: { used: 0, limit: 0 },
  };
}

function resultFromVersion(v: RunVersion, runId: string): DetectResponse {
  const payload = v.result as DetectRunResult;
  return {
    winston: payload.winston,
    runId,
    versionId: v.id,
    insight: payload.insight,
    usage: { used: 0, limit: 0 },
  };
}

export function DetectPageClient({
  initialRun,
  versions,
}: {
  initialRun: RunRow | null;
  versions: RunVersion[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoRun = searchParams.get("autorun") === "1";
  const autoRunStarted = useRef(false);
  const [input, setInput] = useHandoffInput(initialRun?.input_text ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ plan: string; limit: number } | null>(null);
  const [result, setResult] = useState<DetectResponse | null>(
    initialRun ? resultFromRun(initialRun) : null
  );
  const [loadedRunId, setLoadedRunId] = useState<string | null>(initialRun?.id ?? null);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(
    Math.max(0, versions.length - 1)
  );
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffFromValue, setDiffFromValue] = useState<string | null>(
    versions.length > 1 ? versions[Math.max(0, versions.length - 2)].id : null
  );

  const [wantPlagiarism, setWantPlagiarism] = useState(false);
  const [wantFactCheck, setWantFactCheck] = useState(false);
  const [plagiarism, setPlagiarism] = useState<AddonState<PlagiarismResult>>(EMPTY_ADDON);
  const [factCheck, setFactCheck] = useState<AddonState<FactCheckResult>>(EMPTY_ADDON);
  const [insightBusy, setInsightBusy] = useState(false);
  const [insightError, setInsightError] = useState<string | null>(null);

  // Sidebar navigation passes a new initialRun (and its versions); sync during render (no effect).
  if ((initialRun?.id ?? null) !== loadedRunId) {
    setLoadedRunId(initialRun?.id ?? null);
    setPlagiarism(EMPTY_ADDON);
    setFactCheck(EMPTY_ADDON);
    setInsightBusy(false);
    setInsightError(null);
    const lastIndex = Math.max(0, versions.length - 1);
    setSelectedVersionIndex(lastIndex);
    setDiffFromValue(versions.length > 1 ? versions[Math.max(0, versions.length - 2)].id : null);
    if (initialRun) {
      const latestVersion = versions[lastIndex];
      setInput(latestVersion ? latestVersion.input_text : initialRun.input_text);
      setResult(
        latestVersion ? resultFromVersion(latestVersion, initialRun.id) : resultFromRun(initialRun)
      );
      setError(null);
    } else {
      setInput("");
      setResult(null);
    }
  }

  function selectVersion(index: number) {
    if (!initialRun) return;
    const version = versions[index];
    if (!version) return;
    setSelectedVersionIndex(index);
    setInput(version.input_text);
    setResult(resultFromVersion(version, initialRun.id));
    setPlagiarism(EMPTY_ADDON);
    setFactCheck(EMPTY_ADDON);
    setInsightBusy(false);
    setInsightError(null);
  }

  const diffFromOptions: DiffFromOption[] = versions.map((v, i) => ({
    value: v.id,
    label: i === 0 ? "Report 1 (Original)" : `Report ${i + 1}`,
    text: v.input_text,
    score: v.score,
    createdAt: v.created_at,
  }));
  const selectedVersion = versions[selectedVersionIndex];

  const live = useMemo(() => analyzeText(input), [input]);
  const canRun = live.wordCount >= MIN_WORDS_FOR_CHECK && !busy;
  const showReport = busy || result !== null;

  const verified = result?.winston ?? null;
  const scoreForDisplay = verified?.score ?? null;
  const sentenceReport = useMemo(
    () => buildSentenceReport(input, verified),
    [input, verified]
  );

  const requestInsight = useCallback(async (runId: string, versionId?: string | null) => {
    setInsightBusy(true);
    setInsightError(null);
    try {
      const res = await fetch("/api/detection-insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId, versionId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Writing insights are unavailable.");
      setResult((current) => (current ? { ...current, insight: data.insight } : current));
      router.refresh();
    } catch (e) {
      setInsightError(e instanceof Error ? e.message : "Writing insights are unavailable.");
    } finally {
      setInsightBusy(false);
    }
  }, [router]);

  const charCount = input.trim().length;
  const wordCount = live.wordCount;
  const plagiarismEligible =
    wordCount >= MIN_WORDS_FOR_CHECK && charCount >= PLAGIARISM_MIN_CHARS && charCount <= PLAGIARISM_MAX_CHARS;
  const factCheckEligible =
    wordCount >= MIN_WORDS_FOR_CHECK && charCount >= FACT_CHECK_MIN_CHARS && charCount <= FACT_CHECK_MAX_CHARS;
  const plagiarismIneligibleReason =
    wordCount < MIN_WORDS_FOR_CHECK
      ? `Needs at least ${MIN_WORDS_FOR_CHECK} words (this text is ${wordCount}).`
      : `Needs ${PLAGIARISM_MIN_CHARS.toLocaleString()}-${PLAGIARISM_MAX_CHARS.toLocaleString()} characters (this text is ${charCount.toLocaleString()}).`;
  const factCheckIneligibleReason =
    wordCount < MIN_WORDS_FOR_CHECK
      ? `Needs at least ${MIN_WORDS_FOR_CHECK} words (this text is ${wordCount}).`
      : `Needs ${FACT_CHECK_MIN_CHARS.toLocaleString()}-${FACT_CHECK_MAX_CHARS.toLocaleString()} characters (this text is ${charCount.toLocaleString()}).`;

  const runDetect = useCallback(async () => {
    posthog.capture("ai_detection_requested", {
      check_source: "primary",
      includes_plagiarism_check: wantPlagiarism && plagiarismEligible,
      includes_fact_check: wantFactCheck && factCheckEligible,
    });
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
        void requestInsight(next.runId, next.versionId);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  }, [
    input,
    router,
    wantPlagiarism,
    plagiarismEligible,
    wantFactCheck,
    factCheckEligible,
    requestInsight,
  ]);

  async function runPlagiarism() {
    posthog.capture("plagiarism_check_requested", { check_source: "ai_detection_addon" });
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
    posthog.capture("fact_check_requested", { check_source: "ai_detection_addon" });
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

  useEffect(() => {
    if (!autoRun || autoRunStarted.current || !canRun) return;
    autoRunStarted.current = true;
    router.replace("/app/detect");
    void runDetect();
  }, [autoRun, canRun, router, runDetect]);

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
      <div className="mx-auto max-w-[900px] space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">AI Detector</h1>
            <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-muted">
              Paste any text for a clear detector result and sentence-level signals.
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
            <div className="flex items-center gap-2">
              <UploadTextButton onText={setInput} onError={setError} />
              <span className="font-mono text-xs tabular-nums text-faint">
                {live.wordCount} words
                {live.wordCount < MIN_WORDS_FOR_CHECK
                  ? ` · ${MIN_WORDS_FOR_CHECK} words min`
                  : ""}
              </span>
              <InfoTooltip text={WORD_COUNT_HELP_TEXT} />
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

        {input.trim().length === 0 && <RecentRunsPreview />}
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

  const statusLabel = verified ? "Verified result" : busy ? "Verifying..." : "Real-detector check unavailable";
  const statusCaption = verified
    ? `${live.wordCount || initialRun?.word_count || 0} words`
    : busy
      ? `${live.wordCount} words · checking with a real detector...`
      : `${live.wordCount} words · try running the check again in a moment`;

  return (
    <>
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl border border-line bg-raised px-5 py-4">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-4">
            {scoreForDisplay !== null ? (
              <DetectionVerdict score={scoreForDisplay} />
            ) : (
              <div className="size-[72px] shrink-0 animate-pulse rounded-full bg-surface" aria-hidden />
            )}
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
            {result?.runId && <ShareReportButton runId={result.runId} />}
            {versions.length > 1 && diffFromValue && (
              <button
                type="button"
                onClick={() => setDiffOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-faint"
              >
                <GitDiffIcon size={16} weight="bold" />
                Diff
              </button>
            )}
            {result?.runId && (
              <Link
                href={`/app/detect/editor?run=${result.runId}`}
                className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
              >
                <WrenchIcon size={16} weight="bold" />
                Fix flagged lines
              </Link>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-line pt-3">
          <PlagiarismAddonButton
            {...plagiarism}
            eligible={plagiarismEligible}
            ineligibleReason={plagiarismIneligibleReason}
            onRun={runPlagiarism}
          />
          <FactCheckAddonButton
            {...factCheck}
            eligible={factCheckEligible}
            ineligibleReason={factCheckIneligibleReason}
            onRun={runFactCheck}
          />
        </div>

      </div>

      {versions.length > 0 && (
        <VersionTabs versions={versions} selectedIndex={selectedVersionIndex} onSelect={selectVersion} />
      )}

      {error && <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <div className="flex flex-col rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-sm font-medium">Highlighted text</span>
              <div className="flex items-center gap-3 text-[11px] text-faint">
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ background: "var(--bad)" }} />
                  AI-flagged
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ background: "var(--warn)" }} />
                  Mixed
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-2 rounded-full" style={{ background: "var(--good)" }} />
                  Human
                </span>
              </div>
            </div>
            <div className="max-h-[70vh] min-h-[300px] flex-1 overflow-y-auto p-4">
              {verified ? (
                <WinstonHighlightedText text={input} sentences={verified.sentences} showHuman />
              ) : busy ? (
                <div className="space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div
                      key={i}
                      className="h-4 animate-pulse rounded bg-line"
                      style={{ width: `${94 - i * 9}%` }}
                    />
                  ))}
                </div>
              ) : (
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{input}</p>
              )}
            </div>
          </div>

          {verified && result?.runId && (
            <DetectionInsightPanel
              insight={result.insight ?? null}
              busy={insightBusy}
              error={insightError}
              onGenerate={() => requestInsight(result.runId!, selectedVersion?.id ?? result.versionId)}
            />
          )}
          <div className="rounded-2xl border border-line bg-surface p-4">
            <DetectionSignals sentences={sentenceReport} />
          </div>
        </div>

        <aside className="rounded-2xl border border-line bg-surface p-4 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto">
          <ReportSidebar
            score={scoreForDisplay}
            sentences={sentenceReport}
          />
        </aside>
      </div>
    </div>
    <QuotaExceededModal
      open={quota !== null}
      onClose={() => setQuota(null)}
      plan={quota?.plan ?? "free"}
      limit={quota?.limit ?? 0}
    />
    {selectedVersion && diffFromValue && (
      <VersionDiffModal
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        to={{
          label: `Report ${selectedVersionIndex + 1}`,
          text: selectedVersion.input_text,
          score: selectedVersion.score,
          createdAt: selectedVersion.created_at,
        }}
        fromOptions={diffFromOptions}
        fromValue={diffFromValue}
        onFromChange={setDiffFromValue}
      />
    )}
    </>
  );
}
