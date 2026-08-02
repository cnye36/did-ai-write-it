"use client";

import type { Verdict } from "@/lib/detector";
import { Gauge } from "@/components/ui/gauge";

const VERDICT_COLOR: Record<Verdict, string> = {
  human: "var(--good)",
  mixed: "var(--warn)",
  ai: "var(--bad)",
};

const VERDICT_LABEL: Record<Verdict, string> = {
  human: "Reads human",
  mixed: "Borderline",
  ai: "Reads AI",
};

export function ScoreGauge({
  score,
  verdict,
  size = 120,
}: {
  score: number;
  verdict: Verdict;
  size?: number;
}) {
  return <Gauge score={score} color={VERDICT_COLOR[verdict]} label={VERDICT_LABEL[verdict]} size={size} />;
}
