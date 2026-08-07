"use client";

import type { SentenceReportRow } from "@/lib/sentence-report";
import { detectionPresentation } from "@/lib/detection-presentation";

/** Full sentence-by-sentence detector classification. Explanations live in
 * DetectionInsightPanel, where an LLM reviews the actual language instead of
 * presenting heuristic pattern matches as the detector's private reasoning. */
export function DetectionSignals({
  sentences,
}: {
  sentences: SentenceReportRow[];
}) {
  return (
    <div id="sentence-report" className="scroll-mt-6">
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-faint">
        Sentence signals
      </p>
      <p className="mb-3 text-xs leading-relaxed text-faint">
        Each label shows the detector&apos;s direction for that sentence, not proof of who wrote it.
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
                  className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${
                    s.verdict === "human"
                      ? "bg-good-soft text-good"
                      : s.verdict === "mixed"
                        ? "bg-warn-soft text-warn"
                        : "bg-bad-soft text-bad"
                  }`}
                >
                  {detectionPresentation(s.score).signal}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
