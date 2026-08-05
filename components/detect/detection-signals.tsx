"use client";

import type { Verdict } from "@/lib/detector";
import type { SentenceReportRow } from "@/lib/sentence-report";

const VERDICT_CLASSES: Record<Verdict, string> = {
  human: "bg-good-soft text-good",
  mixed: "bg-warn-soft text-warn",
  ai: "bg-bad-soft text-bad",
};

/** Full sentence-by-sentence report, passing and flagged alike: every row
 * gets its own score and a likely-reason breakdown. Lives under the
 * highlighted text; the sidebar's "weakest sentences" preview (top few by
 * score) deep-links here via each row's `id`. Winston never explains a
 * score, so when `verified` is set the reasons are our own pattern engine's
 * best-effort read laid over Winston's sentences, not Winston's own
 * reasoning, and the copy says so.
 */
export function DetectionSignals({
  sentences,
  verified,
}: {
  sentences: SentenceReportRow[];
  verified: boolean;
}) {
  return (
    <div id="sentence-report" className="scroll-mt-6">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">
        Sentence breakdown
      </p>
      <p className="mb-3 text-xs leading-relaxed text-faint">
        {verified
          ? "Every sentence's verified score, with the patterns our signal scan found as a likely explanation."
          : "Every sentence's score, with the patterns our signal scan found as a likely explanation."}
      </p>
      {sentences.length === 0 ? (
        <p className="text-sm text-muted">No sentences to show.</p>
      ) : (
        <ul className="space-y-2">
          {sentences.map((s, i) => (
            <li
              key={i}
              id={`sentence-${i}`}
              className="scroll-mt-6 rounded-[10px] border border-line bg-raised p-3 target:border-accent"
            >
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
              ) : s.verdict === "human" ? (
                <p className="mt-1 text-xs leading-relaxed text-faint">
                  No AI wording patterns detected in this sentence.
                </p>
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
  );
}
