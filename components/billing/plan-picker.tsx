"use client";

import { useState } from "react";
import { PLAN_INFO, PLAN_ORDER, formatPlanPrice, priceForInterval, type BillingInterval } from "@/lib/plans";
import type { Plan } from "@/lib/usage";
import { IntervalToggle } from "./interval-toggle";

export function PlanPicker({
  currentPlan,
  highlightPlan,
  initialInterval = "month",
}: {
  currentPlan: Plan;
  highlightPlan?: Plan;
  initialInterval?: BillingInterval;
}) {
  const [interval, setInterval] = useState<BillingInterval>(initialInterval);
  const [busyPlan, setBusyPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function upgrade(plan: Plan) {
    setBusyPlan(plan);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan, interval }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout.");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setBusyPlan(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex justify-center sm:justify-start">
        <IntervalToggle interval={interval} onChange={setInterval} />
      </div>
      {error && (
        <p className="mb-4 rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((plan) => {
          const info = PLAN_INFO[plan];
          const isCurrent = plan === currentPlan;
          const price = priceForInterval(plan, interval);
          return (
            <div
              key={plan}
              className={`flex h-full flex-col rounded-2xl p-6 ${
                isCurrent
                  ? "bg-accent-soft"
                  : plan === highlightPlan
                    ? "border-2 border-accent"
                    : "border border-line"
              }`}
            >
              <h3 className="font-semibold tracking-tight">{info.name}</h3>
              <p className="mt-1 font-mono text-2xl font-semibold">
                ${formatPlanPrice(price)}
                <span className="text-sm font-normal text-muted">/mo</span>
              </p>
              <ul className="mt-4 flex-1 space-y-2 text-sm leading-relaxed text-muted">
                {info.features.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="mt-6 rounded-full border border-line px-5 py-2.5 text-center text-sm font-medium text-muted">
                  Current plan
                </span>
              ) : plan === "free" ? (
                <span className="mt-6 rounded-full border border-line px-5 py-2.5 text-center text-sm text-faint">
                  Cancel your paid plan to return here
                </span>
              ) : (
                <button
                  type="button"
                  disabled={busyPlan !== null}
                  onClick={() => upgrade(plan)}
                  className="mt-6 rounded-full bg-accent px-5 py-2.5 text-center text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {busyPlan === plan ? "Redirecting..." : `Upgrade to ${info.name}`}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
