import type { RunKind } from "@/lib/runs";
import { detectionPresentation } from "@/lib/detection-presentation";
import { plagiarismVerdict, factCheckVerdict } from "@/lib/score-verdicts";

export type Tone = "good" | "warn" | "bad";

export const TONE_CLASSES: Record<Tone, string> = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
};

export const TONE_LABEL: Record<Tone, string> = { good: "Pass", warn: "Mixed", bad: "Fail" };

export function toneFromColor(color: string): Tone {
  return color === "var(--good)" ? "good" : color === "var(--warn)" ? "warn" : "bad";
}

/** Compact pass/mixed/fail badge, reusing each kind's own canonical verdict
 *  thresholds (lib/detector's verdictFor, lib/score-verdicts) instead of a
 *  raw 0-100 score, which doesn't scan well in a short list row. */
export function scoreBadge(kind: RunKind, score: number | null): { label: string; tone: Tone } | null {
  if (score == null) return null;
  if (kind === "detect") {
    const presentation = detectionPresentation(score);
    const tone =
      presentation.verdict === "human"
        ? "good"
        : presentation.verdict === "mixed"
          ? "warn"
          : "bad";
    return { label: presentation.signal, tone };
  }
  let tone: Tone;
  if (kind === "plagiarism") {
    tone = toneFromColor(plagiarismVerdict(score).color);
  } else if (kind === "fact_check") {
    tone = toneFromColor(factCheckVerdict(score).color);
  } else tone = "warn";
  return { label: TONE_LABEL[tone], tone };
}
