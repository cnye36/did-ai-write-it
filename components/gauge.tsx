"use client";

/** Generic ring gauge: a 0-100 score, explicit color and label. Used by
 * ScoreGauge (AI-detection, higher-is-human) and directly by the plagiarism
 * and fact-check reports, whose score polarity and labels differ per check. */
export function Gauge({
  score,
  color,
  label,
  size = 120,
}: {
  score: number;
  color: string;
  label: string;
  size?: number;
}) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={`${label}, ${score} out of 100`}>
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
        {label}
      </span>
    </div>
  );
}
