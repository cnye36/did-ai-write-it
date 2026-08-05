"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowClockwiseIcon,
  ArrowLeftIcon,
  GitDiffIcon,
  SparkleIcon,
} from "@phosphor-icons/react";
import { analyzeText, verdictFor } from "@/lib/detector";
import { normalize, resolveSentenceScores, verifiedCoverage } from "@/lib/winston-sentences";
import { emptyProvenance, recordProvenance, type ProvenanceMap } from "@/lib/provenance";
import { ScoreGauge } from "@/components/detect/score-gauge";
import { QuotaExceededModal } from "@/components/ui/quota-exceeded-modal";
import { ConfirmRewriteAllModal } from "@/components/detect/confirm-rewrite-all-modal";
import { RichEditor, type RichEditorHandle } from "@/components/editor/rich-editor";
import { InlineSuggestionPopover } from "@/components/editor/inline-suggestion-popover";
import { WinstonHighlightedText } from "@/components/detect/winston-highlighted-text";
import { ExportMenu } from "@/components/detect/export-menu";
import { VersionTabs } from "@/components/detect/version-tabs";
import { VersionDiffModal, type DiffFromOption } from "@/components/detect/version-diff-modal";
import { RescanResultsPanel } from "@/components/detect/rescan-results";
import { buildRescanResults, type RescanResults } from "@/lib/rescan-results";
import type { DetectRunResult, RunRow, RunVersion } from "@/lib/runs";
import posthog from "posthog-js";

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
  texts: string[] | null;
  selectedIndex: number;
}

interface DraftSnapshot {
  text: string;
  doc: object | null;
  savedAt: number;
}

function draftStorageKey(runId: string): string {
  return `editor-draft:${runId}`;
}

function relativeTime(ms: number): string {
  const mins = Math.floor((Date.now() - ms) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
  // Who wrote each unverified sentence, for the editor's provenance
  // highlighting and the post-rescan results report. Session-only: rebuilt
  // fresh each time the editor loads, not persisted.
  const [provenance, setProvenance] = useState<ProvenanceMap>(emptyProvenance());
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [suggestionAnchor, setSuggestionAnchor] = useState<DOMRect | null>(null);
  // "Suggest a rewrite" surfaced directly on the flagged sentence under the
  // pointer, so the user doesn't have to scroll down to find it in the
  // "Flagged in your edit" list below. Two-stage so it doesn't flicker
  // between sentences sitting a word apart: hoverCandidateRef tracks
  // whatever flagged sentence is currently under the pointer (bookkeeping
  // only, never rendered, so it's a ref rather than state), and only gets
  // promoted to hoverTarget (the one actually shown) after HOVER_DWELL_MS of
  // holding still on it. Once shown, it's locked: further pointer movement
  // inside the editor is ignored (see the early return in
  // handleEditorMouseMove) so a tiny drift onto a neighboring sentence can't
  // swap or dismiss it.
  const hoverCandidateRef = useRef<{ start: number; end: number } | null>(null);
  const [hoverTarget, setHoverTarget] = useState<{ start: number; end: number; rect: DOMRect } | null>(
    null
  );
  const hoverDwellTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hoverLeaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [rescanBusy, setRescanBusy] = useState(false);
  const [rescanError, setRescanError] = useState<string | null>(null);
  const [rewriteAllOpen, setRewriteAllOpen] = useState(false);
  const [rewriteAllBusy, setRewriteAllBusy] = useState(false);
  const [rewriteAllError, setRewriteAllError] = useState<string | null>(null);
  const [quota, setQuota] = useState<{ plan: string; limit: number } | null>(null);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffFromValue, setDiffFromValue] = useState(versions[versions.length - 1].id);
  const [rescanResults, setRescanResults] = useState<RescanResults | null>(null);
  const [restoreBanner, setRestoreBanner] = useState<DraftSnapshot | null>(null);

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

  const diffFromOptions: DiffFromOption[] = useMemo(
    () =>
      versions.map((v, i) => ({
        value: v.id,
        label: i === 0 ? "Report 1 (Original)" : `Report ${i + 1}`,
        text: v.input_text,
        score: v.score,
        createdAt: v.created_at,
      })),
    [versions]
  );

  const verifiedScore = versionScore(selectedVersion);
  const verifiedVerdict = verdictFor(verifiedScore);

  // On mount, offer to restore a draft left behind by an accidental
  // navigation (there's no autosave to the server between scans, only on
  // "Scan again"). Only surfaced when it actually differs from what just
  // loaded, so a clean reopen never shows a pointless banner.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftStorageKey(run.id));
      if (!raw) return;
      const snapshot = JSON.parse(raw) as DraftSnapshot;
      if (snapshot.text && snapshot.text !== versions[versions.length - 1].input_text) {
        setRestoreBanner(snapshot);
      }
    } catch {
      // Corrupt or inaccessible storage: nothing to restore.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.id]);

  // Debounced local safety net: every edit is written to localStorage (not
  // the server) so an accidental navigation before the next "Scan again"
  // doesn't lose work. Cleared on a successful rescan (see scanAgain) and on
  // an explicit "Discard" of the restore banner.
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        const snapshot: DraftSnapshot = { text: draft, doc: docJson, savedAt: Date.now() };
        localStorage.setItem(draftStorageKey(run.id), JSON.stringify(snapshot));
      } catch {
        // Storage full/unavailable: autosave is a best-effort safety net.
      }
    }, 800);
    return () => clearTimeout(t);
  }, [draft, docJson, run.id]);

  function restoreDraft() {
    if (!restoreBanner) return;
    editorRef.current?.replaceAll(restoreBanner.text, { doc: restoreBanner.doc ?? undefined });
    setRestoreBanner(null);
  }

  function discardRestore() {
    setRestoreBanner(null);
    try {
      localStorage.removeItem(draftStorageKey(run.id));
    } catch {
      // Ignore: nothing more to do if storage isn't available.
    }
  }

  function updateSelection() {
    setSelection(editorRef.current?.getSelectionTextRange() ?? null);
  }

  async function requestSuggestion(start: number, end: number, source: Suggestion["source"]) {
    const spanText = draft.slice(start, end);
    posthog.capture("rewrite_suggestion_requested", { source });
    editorRef.current?.focusRange(start, end);
    setSuggestionAnchor(editorRef.current?.getRangeRect(start, end) ?? null);
    setSuggestion({ start, end, spanText, source, busy: true, error: null, texts: null, selectedIndex: 0 });
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
        setSuggestionAnchor(null);
        return;
      }
      if (!res.ok) throw new Error(data.error ?? "Could not get a suggestion.");
      setSuggestion({
        start,
        end,
        spanText,
        source,
        busy: false,
        error: null,
        texts: data.suggestions,
        selectedIndex: 0,
      });
    } catch (e) {
      setSuggestion((s) =>
        s ? { ...s, busy: false, error: e instanceof Error ? e.message : "Could not get a suggestion." } : s
      );
    }
  }

  function acceptSuggestion() {
    const text = suggestion?.texts?.[suggestion.selectedIndex];
    if (!text || !suggestion) return;
    const { start, end, spanText } = suggestion;
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
    editorRef.current?.replaceTextRange(targetStart, targetEnd, text, { origin: "ai" });
    posthog.capture("rewrite_suggestion_applied", { source: suggestion.source });
    setSuggestion(null);
    setSuggestionAnchor(null);
    setSelection(null);
  }

  function dismissSuggestion() {
    setSuggestion(null);
    setSuggestionAnchor(null);
  }

  const HOVER_DWELL_MS = 3000;
  const HOVER_LEAVE_GRACE_MS = 300;

  function clearHoverDwellTimer() {
    if (hoverDwellTimer.current) {
      clearTimeout(hoverDwellTimer.current);
      hoverDwellTimer.current = null;
    }
  }

  function clearHoverLeaveTimer() {
    if (hoverLeaveTimer.current) {
      clearTimeout(hoverLeaveTimer.current);
      hoverLeaveTimer.current = null;
    }
  }

  /** Grace period before actually hiding a locked target: the button sits
   *  just outside the editor's own box, so the pointer briefly leaves the
   *  editor in transit to it. Cancelled by the button's own onMouseEnter. */
  function scheduleHoverTargetHide() {
    clearHoverLeaveTimer();
    hoverLeaveTimer.current = setTimeout(() => setHoverTarget(null), HOVER_LEAVE_GRACE_MS);
  }

  function handleEditorMouseMove(e: React.MouseEvent) {
    if (suggestion) return;
    // Locked: ignore pointer movement entirely so a tiny drift onto a
    // neighboring sentence (they can sit a word apart) can't swap or
    // dismiss the button that's already showing.
    if (hoverTarget) return;

    clearHoverLeaveTimer();
    const offset = editorRef.current?.getTextOffsetAtClientPoint(e.clientX, e.clientY);
    const match =
      offset == null ? undefined : flaggedSentences.find((s) => offset >= s.start && offset < s.end);

    if (!match) {
      clearHoverDwellTimer();
      hoverCandidateRef.current = null;
      return;
    }

    const prev = hoverCandidateRef.current;
    if (prev && prev.start === match.start && prev.end === match.end) return;

    // A new candidate: restart the dwell timer from scratch.
    clearHoverDwellTimer();
    hoverCandidateRef.current = { start: match.start, end: match.end };
    hoverDwellTimer.current = setTimeout(() => {
      const rect = editorRef.current?.getRangeRect(match.start, match.end) ?? null;
      if (rect) setHoverTarget({ start: match.start, end: match.end, rect });
    }, HOVER_DWELL_MS);
  }

  function handleEditorMouseLeave() {
    clearHoverDwellTimer();
    hoverCandidateRef.current = null;
    if (hoverTarget) scheduleHoverTargetHide();
  }

  // The hover target's rect is a snapshot; scrolling or editing invalidates
  // it, so drop it rather than let a stale button drift away from its
  // sentence.
  useEffect(() => {
    if (!hoverTarget) return;
    function hide() {
      setHoverTarget(null);
    }
    document.addEventListener("scroll", hide, true);
    return () => document.removeEventListener("scroll", hide, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoverTarget !== null]);

  useEffect(() => {
    hoverCandidateRef.current = null;
    setHoverTarget(null);
  }, [draft]);

  useEffect(() => {
    return () => {
      clearHoverDwellTimer();
      clearHoverLeaveTimer();
    };
  }, []);

  // Keeps the popover glued to its sentence as the page scrolls/resizes
  // (the editor's own scroll container included: scroll events don't
  // bubble, but they do reach a capturing-phase document listener).
  useEffect(() => {
    if (!suggestion) return;
    function reposition() {
      setSuggestionAnchor(editorRef.current?.getRangeRect(suggestion!.start, suggestion!.end) ?? null);
    }
    window.addEventListener("resize", reposition);
    document.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      document.removeEventListener("scroll", reposition, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion?.start, suggestion?.end]);

  // Dismiss on outside click / Escape, same as every other dropdown/popover
  // in this app (e.g. FilterMenu in components/ui/app-sidebar.tsx).
  useEffect(() => {
    if (!suggestion) return;
    function onPointerDown(e: PointerEvent) {
      const popover = document.getElementById("inline-suggestion-popover");
      if (popover && !popover.contains(e.target as Node)) dismissSuggestion();
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") dismissSuggestion();
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion !== null]);

  async function rewriteAll() {
    posthog.capture("rewrite_all_requested");
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
      editorRef.current?.replaceAll(data.text, { origin: "ai" });
      setRewriteAllOpen(false);
    } catch (e) {
      setRewriteAllError(e instanceof Error ? e.message : "Rewrite failed.");
    } finally {
      setRewriteAllBusy(false);
    }
  }

  async function scanAgain() {
    posthog.capture("detection_rescan_requested");
    setRescanBusy(true);
    setRescanError(null);
    setRescanResults(null);
    const previousVersion = versions[versions.length - 1];
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
        setDiffFromValue(newVersion.id);
        setRescanResults(buildRescanResults(previousVersion, newVersion, provenance));
        try {
          localStorage.removeItem(draftStorageKey(run.id));
        } catch {
          // Ignore: the version is now saved server-side either way.
        }
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
            <p className="mt-2 text-xs font-medium uppercase tracking-wide text-faint">Revision History</p>
            <h1 className="text-2xl font-semibold tracking-tight">{run.title}</h1>
            <p className="mt-1 text-sm text-muted">
              Fix what got flagged, at your own pace. Scan again whenever you want a real score.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setDiffOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink transition-colors hover:border-faint"
            >
              <GitDiffIcon size={16} weight="bold" />
              Diff
            </button>
            <button
              type="button"
              disabled={rescanBusy || live.wordCount < 15}
              onClick={scanAgain}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowClockwiseIcon size={16} weight="bold" className={rescanBusy ? "animate-spin" : ""} />
              {rescanBusy ? "Scanning..." : "Scan again"}
            </button>
          </div>
        </div>

        {rescanError && <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{rescanError}</p>}

        {restoreBanner && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[10px] border border-line bg-accent-soft px-4 py-3">
            <p className="text-sm text-ink">
              Unsaved edit from {relativeTime(restoreBanner.savedAt)} found.
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={restoreDraft}
                className="text-xs font-medium text-accent hover:underline"
              >
                Restore
              </button>
              <button
                type="button"
                onClick={discardRestore}
                className="text-xs font-medium text-faint hover:text-ink"
              >
                Discard
              </button>
            </div>
          </div>
        )}

        <VersionTabs versions={versions} selectedIndex={selectedIndex} onSelect={setSelectedIndex} />

        {rescanResults && (
          <RescanResultsPanel results={rescanResults} onDismiss={() => setRescanResults(null)} />
        )}

        <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-2">
          <div className="flex flex-col rounded-2xl border border-line bg-surface">
            <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
              <span className="text-sm font-medium">Your edit</span>
              <div className="flex items-center gap-2">
                <ExportMenu getDoc={() => editorRef.current?.getDoc() ?? {}} title={run.title} />
                <span className="text-xs text-faint">Scan again for a real score</span>
              </div>
            </div>
            <RichEditor
              handleRef={editorRef}
              initialDoc={docJson}
              initialText={draft}
              winstonSentences={latestWinston?.sentences ?? null}
              provenance={provenance}
              onChange={({ text, doc, origin }) => {
                setProvenance((p) => recordProvenance(p, draft, text, origin));
                setDraft(text);
                setDocJson(doc);
              }}
              onSelectionChange={() => {
                updateSelection();
                // Clicking to place the cursor or select elsewhere is an
                // unambiguous "I'm done with that sentence": release the
                // lock so hovering a new one can dwell into the button too.
                hoverCandidateRef.current = null;
                setHoverTarget(null);
              }}
              onEditorMouseMove={handleEditorMouseMove}
              onEditorMouseLeave={handleEditorMouseLeave}
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
        </div>

        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">
            Flagged in your edit ({flaggedSentences.length})
          </p>
          {flaggedSentences.length === 0 ? (
            <p className="text-sm text-muted">Nothing flagged right now.</p>
          ) : (
            <ul className="space-y-3">
              {flaggedSentences.map((s) => {
                const origin = provenance.get(normalize(s.text)) ?? "user";
                return (
                <li key={`${s.start}-${s.end}`} className="rounded-[10px] border border-line bg-raised p-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm leading-relaxed text-ink">{s.text}</p>
                    {s.source === "verified" ? (
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 font-mono text-xs tabular-nums"
                        style={{
                          background: s.verdict === "mixed" ? "var(--warn-soft)" : "var(--bad-soft)",
                          color: s.verdict === "mixed" ? "var(--warn)" : "var(--bad)",
                        }}
                      >
                        {s.score}
                      </span>
                    ) : (
                      <span
                        className="shrink-0 rounded-full border border-dashed px-2 py-0.5 text-xs"
                        style={{
                          borderColor: origin === "ai" ? "var(--warn)" : "var(--accent)",
                          color: origin === "ai" ? "var(--warn)" : "var(--accent)",
                        }}
                      >
                        {origin === "ai" ? "AI rewrite" : "Your edit"}, not yet scanned
                      </span>
                    )}
                  </div>
                  {s.source === "verified" && (
                    <p className="mt-1 text-[11px] font-medium text-faint">Verified score</p>
                  )}
                  {s.reasons.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {s.reasons.map((r) => (
                        <span
                          key={r}
                          className="rounded-full bg-surface px-2 py-1 text-xs leading-tight text-muted"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
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
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {hoverTarget && !suggestion && (
        <button
          type="button"
          onMouseEnter={clearHoverLeaveTimer}
          onMouseLeave={scheduleHoverTargetHide}
          onClick={() => {
            const target = hoverTarget;
            hoverCandidateRef.current = null;
            setHoverTarget(null);
            requestSuggestion(target.start, target.end, "sentence");
          }}
          style={{
            position: "fixed",
            zIndex: 30,
            left: Math.max(8, hoverTarget.rect.left),
            top:
              hoverTarget.rect.top > 44
                ? hoverTarget.rect.top - 34
                : hoverTarget.rect.bottom + 6,
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-line bg-raised px-2.5 py-1 text-xs font-medium text-ink shadow-md transition-colors hover:border-accent hover:text-accent"
        >
          <SparkleIcon size={12} weight="bold" />
          Suggest a rewrite
        </button>
      )}

      <InlineSuggestionPopover
        anchorRect={suggestionAnchor}
        sourceLabel={suggestion?.source === "sentence" ? "this sentence" : "your selection"}
        spanText={suggestion?.spanText ?? ""}
        busy={suggestion?.busy ?? false}
        error={suggestion?.error ?? null}
        texts={suggestion?.texts ?? null}
        selectedIndex={suggestion?.selectedIndex ?? 0}
        onSelect={(i) => setSuggestion((s) => (s ? { ...s, selectedIndex: i } : s))}
        onAccept={acceptSuggestion}
        onRetry={() => suggestion && requestSuggestion(suggestion.start, suggestion.end, suggestion.source)}
        onDismiss={dismissSuggestion}
      />

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
      <VersionDiffModal
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        to={{ label: "Current edit", text: draft, score: null, createdAt: new Date().toISOString() }}
        fromOptions={diffFromOptions}
        fromValue={diffFromValue}
        onFromChange={setDiffFromValue}
      />
    </>
  );
}
