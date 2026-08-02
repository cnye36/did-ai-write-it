"use client";

import { reasonsForRange, verdictFor, type DetectorResult, type Verdict } from "@/lib/detector";
import { locateWinstonSentences } from "@/components/detect/winston-highlighted-text";
import type { WinstonSentence } from "@/components/detect/winston-sentence-list";

const VERDICT_CLASSES: Record<Verdict, string> = {
  human: "bg-good-soft text-good",
  mixed: "bg-warn-soft text-warn",
  ai: "bg-bad-soft text-bad",
};

interface FlaggedSentence {
  text: string;
  score: number;
  verdict: Verdict;
  reasons: string[];
}

function flaggedFromWinston(
  text: string,
  sentences: WinstonSentence[],
  flags: DetectorResult["flags"]
): FlaggedSentence[] {
  return locateWinstonSentences(text, sentences)
    .map((s) => ({
      text: s.text,
      score: s.score,
      verdict: verdictFor(s.score),
      reasons: reasonsForRange(flags, s.start, s.end),
    }))
    .filter((s) => s.verdict !== "human");
}

function flaggedFromHeuristic(result: DetectorResult): FlaggedSentence[] {
  return result.sentences
    .filter((s) => s.verdict !== "human")
    .map((s) => ({ text: s.text, score: s.score, verdict: s.verdict, reasons: s.reasons }));
}

/**
 * The transparency layer behind a single score: the six signal scores
 * (lib/detector.ts) that back the homepage's "burstiness, rhythm,
 * vocabulary..." pitch, plus a likely-reason breakdown per flagged sentence.
 * Winston never explains a score, so when `verified` is set the reasons are
 * our own pattern engine's best-effort read laid over Winston's sentences,
 * not Winston's own reasoning, and the copy says so.
 */
export function DetectionSignals({
  text,
  live,
  verified,
}: {
  text: string;
  live: DetectorResult;
  verified: { score: number; sentences: WinstonSentence[] } | null;
}) {
  const flagged = verified
    ? flaggedFromWinston(text, verified.sentences, live.flags)
    : flaggedFromHeuristic(live);

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">Signal breakdown</p>
        <p className="mb-3 text-xs leading-relaxed text-faint">
          The writing patterns behind the score: how much this text varies, how repetitive its
          rhythm and structure are, and how much stock AI vocabulary it leans on.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {live.metrics.map((m) => (
            <div key={m.id} className="rounded-[10px] border border-line bg-raised p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{m.label}</span>
                <span className="font-mono text-xs tabular-nums text-faint">{m.score}/100</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${Math.max(0, Math.min(100, m.score))}%` }}
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted">{m.detail}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">
          Flagged sentences
        </p>
        <p className="mb-3 text-xs leading-relaxed text-faint">
          {verified
            ? "Winston doesn't publish its own reasoning, so these are the patterns our own signal scan found in each flagged sentence, offered as a likely explanation, not Winston's literal reasoning."
            : "Patterns our signal scan found in each flagged sentence."}
        </p>
        {flagged.length === 0 ? (
          <p className="text-sm text-muted">No sentences were flagged in this text.</p>
        ) : (
          <ul className="space-y-2">
            {flagged.map((s, i) => (
              <li key={i} className="rounded-[10px] border border-line bg-raised p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-relaxed text-ink">{s.text}</p>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-xs tabular-nums ${VERDICT_CLASSES[s.verdict]}`}
                  >
                    {s.score}
                  </span>
                </div>
                <p className="mt-2 text-[11px] font-medium uppercase tracking-wide text-faint">
                  Likely reason{s.reasons.length > 1 ? "s" : ""}
                </p>
                {s.reasons.length > 0 ? (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {s.reasons.map((r) => (
                      <span
                        key={r}
                        className="rounded-full bg-surface px-2 py-1 text-xs leading-tight text-muted"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-xs leading-relaxed text-faint">
                    No specific wording pattern matched our scan; flagged on the detector&apos;s own
                    model.
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
