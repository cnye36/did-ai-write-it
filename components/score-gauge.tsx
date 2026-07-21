"use client";

import type { Verdict } from "@/lib/detector";

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
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  const color = VERDICT_COLOR[verdict];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`Human score ${score} out of 100`}>
          <circle cx="60" cy="60" r={r} fill="none" stroke="var(--line)" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${c - filled}`}
            transform="rotate(-90 60 60)"
            style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.16,1,0.3,1), stroke 0.3s" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-semibold tabular-nums" style={{ color }}>
            {score}
          </span>
        </div>
      </div>
      <span className="text-sm font-medium" style={{ color }}>
        {VERDICT_LABEL[verdict]}
      </span>
    </div>
  );
}
