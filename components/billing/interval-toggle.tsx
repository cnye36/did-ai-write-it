"use client";

import type { BillingInterval } from "@/lib/plans";

export function IntervalToggle({
  interval,
  onChange,
}: {
  interval: BillingInterval;
  onChange: (interval: BillingInterval) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-line p-1">
      <button
        type="button"
        onClick={() => onChange("month")}
        className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          interval === "month" ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
        }`}
      >
        Monthly
      </button>
      <button
        type="button"
        onClick={() => onChange("year")}
        className={`inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
          interval === "year" ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"
        }`}
      >
        Annual
        <span
          className={`rounded-full px-1.5 py-0.5 text-[11px] font-medium ${
            interval === "year" ? "bg-accent-ink/15 text-accent-ink" : "bg-good-soft text-good"
          }`}
        >
          50% off
        </span>
      </button>
    </div>
  );
}
