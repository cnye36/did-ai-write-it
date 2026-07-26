"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { analyzeText, verdictFor } from "@/lib/detector";
import { HANDOFF_KEY } from "@/lib/handoff";
import { ScoreGauge } from "@/components/score-gauge";
import { DetectionReport } from "@/components/detection-report";
import { WinstonSentenceList, type WinstonSentence } from "@/components/winston-sentence-list";

interface DetectResponse {
  /** null when Winston isn't configured, the text was too short, or the request failed. */
  winston: { score: number; sentences: WinstonSentence[] } | null;
  usage: { used: number; limit: number };
}

export default function DetectPage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DetectResponse | null>(null);

  useEffect(() => {
    const handoff = sessionStorage.getItem(HANDOFF_KEY);
    if (handoff) {
      setInput(handoff);
      sessionStorage.removeItem(HANDOFF_KEY);
    }
  }, []);

  const live = useMemo(() => analyzeText(input), [input]);
  const canRun = live.wordCount >= 15 && !busy;

  async function check() {
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
      if (!res.ok) throw new Error(data.error ?? "Check failed.");
      setResult(data as DetectResponse);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI Detector</h1>
        <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-muted">
          Paste any text to get an instant free AI score, then verify it
          against Winston AI, a real third-party detector.
        </p>
      </div>

      <div className="flex flex-col rounded-2xl border border-line bg-raised">
        <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
          <span className="text-sm font-medium">Your text</span>
          <span className="font-mono text-xs tabular-nums text-faint">
            {live.wordCount} words
            {live.wordCount >= 15 && ` · ${live.score}/100 human (quick estimate)`}
          </span>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={12}
          aria-label="Text to check for AI"
          placeholder="Paste the text you want to check..."
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
            {busy ? "Checking..." : "Check with Winston"}
          </button>
        </div>
      </div>

      {error && <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>}

      {live.wordCount >= 15 && <DetectionReport text={input} result={live} />}

      {busy && (
        <div className="space-y-3 rounded-2xl border border-line bg-raised p-6">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-4 animate-pulse rounded bg-line"
              style={{ width: `${80 - i * 10}%` }}
            />
          ))}
        </div>
      )}

      {result && (
        <div className="rounded-2xl border border-line bg-raised p-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-faint">
              Verified score
            </p>
            <span className="text-xs text-faint">Winston AI</span>
          </div>
          {result.winston ? (
            <>
              <div className="flex items-center gap-4">
                <ScoreGauge
                  score={result.winston.score}
                  verdict={verdictFor(result.winston.score)}
                  size={88}
                />
                <p className="max-w-[42ch] text-xs leading-relaxed text-faint">
                  Scored by Winston AI, a third-party detector, independent of
                  the free heuristic above.
                </p>
              </div>
              {result.winston.sentences.length > 0 && (
                <div className="mt-5 border-t border-line pt-4">
                  <WinstonSentenceList sentences={result.winston.sentences} />
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-muted">
              Winston-verified check unavailable for this text. It may be too
              short, or the service is temporarily unreachable.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
