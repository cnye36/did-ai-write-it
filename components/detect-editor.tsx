"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  CheckIcon,
  SparkleIcon,
  XIcon,
} from "@phosphor-icons/react";
import { analyzeText, verdictFor } from "@/lib/detector";
import { resolveSentenceScores, verifiedCoverage } from "@/lib/winston-sentences";
import { ScoreGauge } from "@/components/score-gauge";
import { QuotaExceededModal } from "@/components/quota-exceeded-modal";
import { ConfirmRewriteAllModal } from "@/components/confirm-rewrite-all-modal";
import { RichEditor, type RichEditorHandle } from "@/components/rich-editor";
import { WinstonHighlightedText } from "@/components/winston-highlighted-text";
import type { DetectRunResult, RunRow, RunVersion } from "@/lib/runs";

function versionScore(v: RunVersion): number {
  return v.score ?? 0;
}

function winstonOf(v: RunVersion): DetectRunResult["winston"] | null {
  const result = v.result as Partial<DetectRunResult>;
  return result.winston ?? null;
}

interface Suggestion {
  start: number;
  end: number;
  spanText: string;
  source: "sentence" | "selection";
  busy: boolean;
  error: string | null;
  text: string | null;
}

export function DetectEditorClient({
  run,
  versions: initialVersions,
}: {
  run: RunRow;
  versions: RunVersion[];
}) {
  const router = useRouter();
  const editorRef = useRef<RichEditorHandle>(null);

  const [versions, setVersions] = useState<RunVersion[]>(
    initialVersions.length > 0
      ? initialVersions
      : [
          {
            id: run.id,
            input_text: run.input_text,
            word_count: run.word_count,
            score: run.score,
            result: run.result,
            doc: run.doc,
            created_at: run.created_at,
          },
        ]
  );
  const [selectedIndex, setSelectedIndex] = useState(versions.length - 1);
  const selectedVersion = versions[selectedIndex];

  const [draft, setDraft] = useState(versions[versions.length - 1].input_text);
  const [docJson, setDocJson] = useState<object | null>(
    (versions[versions.length - 1].doc as object | null) ?? null
  );
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const [rescanBusy, setRescanBusy] = useState(false);
  const [rescanError, setRescanError] = useState<string | null>(null);
  const [rewriteAllOpen, setRewriteAllOpen] = useState(false);
  const [rewriteAllBusy, setRewriteAllBusy] = useState(false);
  const [rewriteAllError, setRewriteAllError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ plan: string; limit: number } | null>(null);

  const live = useMemo(() => analyzeText(draft), [draft]);

  // Anchored per-sentence scores: Winston's real number wherever the user
  // hasn't touched the sentence, our heuristic only for what they've changed.
  const latestWinston = winstonOf(versions[versions.length - 1]);
  const resolved = useMemo(
    () => resolveSentenceScores(draft, latestWinston?.sentences),
    [draft, latestWinston]
  );
  const coverage = verifiedCoverage(resolved);
  const flaggedSentences = useMemo(
    () => resolved.filter((s) => s.verdict !== "human"),
    [resolved]
  );

  const verifiedScore = versionScore(selectedVersion);
  const verifiedVerdict = verdictFor(verifiedScore);
  const delta = live.score - verifiedScore;

  function updateSelection() {
    setSelection(editorRef.current?.getSelectionTextRange() ?? null);
  }

  async function requestSuggestion(start: number, end: number, source: Suggestion["source"]) {
    const spanText = draft.slice(start, end);
    setSuggestion({ start, end, spanText, source, busy: true, error: null, text: null });
    try {
      const res = await fetch("/api/rewrite-assist/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft, start, end }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setQuota({ plan: data.plan, limit: data.limit });
        setSuggestion(null);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Could not get a suggestion.");
      setSuggestion({ start, end, spanText, source, busy: false, error: null, text: data.suggestion });
    } catch (e) {
      setSuggestion((s) =>
        s ? { ...s, busy: false, error: e instanceof Error ? e.message : "Could not get a suggestion." } : s
      );
    }
  }

  function acceptSuggestion() {
    if (!suggestion?.text) return;
    const { start, end, spanText, text } = suggestion;
    // The span may have moved while the request was in flight, so re-locate it
    // by content before splicing. (ProseMirror re-maps its own positions, but
    // these offsets were captured in plain-text space before the round trip.)
    const current = editorRef.current?.getText() ?? draft;
    let targetStart = start;
    let targetEnd = end;
    if (current.slice(start, end) !== spanText) {
      const found = current.indexOf(spanText);
      if (found === -1) {
        setSuggestion((s) => (s ? { ...s, error: "The text changed, could not apply this. Try again." } : s));
        return;
      }
      targetStart = found;
      targetEnd = found + spanText.length;
    }
    editorRef.current?.replaceTextRange(targetStart, targetEnd, text);
    setSuggestion(null);
    setSelection(null);
  }

  function dismissSuggestion() {
    setSuggestion(null);
  }

  async function rewriteAll() {
    setRewriteAllBusy(true);
    setRewriteAllError(null);
    try {
      const res = await fetch("/api/rewrite-assist/rewrite-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setQuota({ plan: data.plan, limit: data.limit });
        setRewriteAllOpen(false);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Rewrite failed.");
      editorRef.current?.replaceAll(data.text);
      setRewriteAllOpen(false);
    } catch (e) {
      setRewriteAllError(e instanceof Error ? e.message : "Rewrite failed.");
    } finally {
      setRewriteAllBusy(false);
    }
  }

  async function scanAgain() {
    setRescanBusy(true);
    setRescanError(null);
    try {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: draft, runId: run.id, doc: docJson }),
      });
      const data = await res.json();
      if (res.status === 402) {
        setQuota({ plan: data.plan, limit: data.limit });
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Scan failed.");
      if (data.winston) {
        const newVersion: RunVersion = {
          id: `local-${Date.now()}`,
          input_text: draft,
          word_count: analyzeText(draft).wordCount,
          score: data.winston.score,
          result: { winston: data.winston },
          doc: docJson,
          created_at: new Date().toISOString(),
        };
        setVersions((v) => {
          const next = [...v, newVersion];
          setSelectedIndex(next.length - 1);
          return next;
        });
      }
      router.refresh();
    } catch (e) {
      setRescanError(e instanceof Error ? e.message : "Scan failed.");
    } finally {
      setRescanBusy(false);
    }
  }

  const selectedWinston = winstonOf(selectedVersion);

  return (
    <>
      <div className="space-y-4">
        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <Link
              href={`/app/detect?run=${run.id}`}
              className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
            >
              <ArrowLeftIcon size={14} weight="bold" />
              Back to report
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{run.title}</h1>
            <p className="mt-1 text-sm text-muted">
              Fix what got flagged, at your own pace. Scan again whenever you want a real score.
            </p>
          </div>
          <button
            type="button"
            disabled={rescanBusy || live.wordCount < 15}
            onClick={scanAgain}
            className="inline-flex shrink-0 items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowClockwiseIcon size={16} weight="bold" className={rescanBusy ? "animate-spin" : ""} />
            {rescanBusy ? "Scanning..." : "Scan again"}
          </button>
        </div>

        {rescanError && <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{rescanError}</p>}

        <div className="flex flex-wrap items-center gap-2">
          {versions.map((v, i) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedIndex(i)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                i === selectedIndex
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-muted hover:border-faint"
              }`}
            >
              Report {i + 1} · {versionScore(v)}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-sm font-medium">Report {selectedIndex + 1}</span>
              {selectedWinston && (
                <div className="flex items-center gap-2">
                  <ScoreGauge score={verifiedScore} verdict={verifiedVerdict} size={32} />
                  <span className="text-xs text-faint">Verified score</span>
                </div>
              )}
            </div>
            <div className="max-h-[55vh] min-h-[280px] flex-1 overflow-y-auto p-4">
              {selectedWinston ? (
                <WinstonHighlightedText
                  text={selectedVersion.input_text}
                  sentences={selectedWinston.sentences}
                  flags={live.flags}
                  showHuman
                />
              ) : (
                <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
                  {selectedVersion.input_text}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-sm font-medium">Your edit</span>
              <div className="flex items-center gap-2">
                <ScoreGauge score={live.score} verdict={live.verdict} size={32} />
                <span className="text-xs text-faint">
                  Quick estimate{selectedWinston ? ` (${delta >= 0 ? "+" : ""}${delta} vs verified)` : ""}
                </span>
              </div>
            </div>
            <RichEditor
              handleRef={editorRef}
              initialDoc={docJson}
              initialText={draft}
              winstonSentences={latestWinston?.sentences ?? null}
              onChange={({ text, doc }) => {
                setDraft(text);
                setDocJson(doc);
              }}
              onSelectionChange={updateSelection}
            />
            {selection && !suggestion && (
              <div className="border-t border-line px-4 py-2.5">
                <button
                  type="button"
                  onClick={() => requestSuggestion(selection.start, selection.end, "selection")}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-faint"
                >
                  <SparkleIcon size={13} weight="bold" />
                  Rewrite selection
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="font-mono text-xs tabular-nums text-faint">{live.wordCount} words</span>
                <span className="text-[11px] text-faint">
                  {coverage.verified === coverage.total
                    ? "all sentences verified"
                    : `${coverage.verified}/${coverage.total} verified, rest estimated`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRewriteAllOpen(true)}
                className="text-xs font-medium text-accent hover:underline"
              >
                Rewrite entire draft
              </button>
            </div>
          </div>
        </div>

        {suggestion && (
          <div className="rounded-2xl border border-line bg-raised p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-faint">
              Suggested rewrite for {suggestion.source === "sentence" ? "this sentence" : "your selection"}
            </p>
            <p className="mt-2 rounded-[10px] bg-surface p-3 text-sm text-muted line-through decoration-faint">
              {suggestion.spanText}
            </p>
            {suggestion.busy ? (
              <div className="mt-2 h-10 animate-pulse rounded-[10px] bg-surface" />
            ) : suggestion.error ? (
              <p className="mt-2 text-sm text-bad">{suggestion.error}</p>
            ) : (
              <p className="mt-2 rounded-[10px] bg-accent-soft p-3 text-sm">{suggestion.text}</p>
            )}
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                disabled={suggestion.busy || !suggestion.text}
                onClick={acceptSuggestion}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-xs font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CheckIcon size={13} weight="bold" />
                Use this
              </button>
              {!suggestion.busy && (
                <button
                  type="button"
                  onClick={() => requestSuggestion(suggestion.start, suggestion.end, suggestion.source)}
                  className="text-xs font-medium text-muted hover:text-ink"
                >
                  Try again
                </button>
              )}
              <button
                type="button"
                onClick={dismissSuggestion}
                className="ml-auto inline-flex items-center gap-1 text-xs text-faint hover:text-ink"
              >
                <XIcon size={12} weight="bold" />
                Dismiss
              </button>
            </div>
          </div>
        )}

        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">
            Flagged in your edit ({flaggedSentences.length})
          </p>
          {flaggedSentences.length === 0 ? (
            <p className="text-sm text-muted">Nothing flagged right now.</p>
          ) : (
            <ul className="space-y-3">
              {flaggedSentences.map((s) => (
                <li key={`${s.start}-${s.end}`} className="rounded-[10px] border border-line p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed">{s.text}</p>
                    <span
                      className="shrink-0 rounded-full px-2 py-0.5 font-mono text-xs tabular-nums"
                      style={{
                        background: s.verdict === "mixed" ? "var(--warn-soft)" : "var(--bad-soft)",
                        color: s.verdict === "mixed" ? "var(--warn)" : "var(--bad)",
                      }}
                    >
                      {s.score}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-faint">
                    {s.source === "verified" ? "Verified score" : "Estimated, rescan to confirm"}
                  </p>
                  {s.reasons.length > 0 && (
                    <ul className="mt-1.5 space-y-0.5">
                      {s.reasons.map((r) => (
                        <li key={r} className="text-xs text-muted">
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                  <button
                    type="button"
                    onClick={() => requestSuggestion(s.start, s.end, "sentence")}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-ink transition-colors hover:border-faint"
                  >
                    <SparkleIcon size={12} weight="bold" />
                    Suggest a rewrite
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ConfirmRewriteAllModal
        open={rewriteAllOpen}
        busy={rewriteAllBusy}
        onConfirm={rewriteAll}
        onClose={() => setRewriteAllOpen(false)}
      />
      {rewriteAllError && (
        <p className="mt-2 rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{rewriteAllError}</p>
      )}
      <QuotaExceededModal
        open={quota !== null}
        onClose={() => setQuota(null)}
        plan={quota?.plan ?? "free"}
        limit={quota?.limit ?? 0}
      />
    </>
  );
}
