"use client";

import { useState } from "react";
import Link from "next/link";
import { PLAN_INFO, PLAN_ORDER, formatPlanPrice, priceForInterval, type BillingInterval } from "@/lib/plans";
import { IntervalToggle } from "@/components/billing/interval-toggle";
import { PlanComparisonTable } from "@/components/pricing/plan-comparison-table";

const ROADMAP = [
  "AI writing assistant: draft clean copy from scratch (coming soon)",
  "Humanizer: rewrite flagged text until it reads human (returning soon)",
  ".docx and .pdf upload, not just plain text",
  "Referral credits for teams that invite others",
];

export function PricingComparison() {
  const [interval, setInterval] = useState<BillingInterval>("month");

  return (
    <div className="space-y-16">
      <div className="flex justify-center">
        <IntervalToggle interval={interval} onChange={setInterval} />
      </div>

      {/* Plan cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLAN_ORDER.map((plan) => {
          const info = PLAN_INFO[plan];
          const highlight = plan === "pro";
          const price = priceForInterval(plan, interval);
          return (
            <div
              key={plan}
              className={`flex h-full flex-col rounded-2xl p-6 ${
                highlight ? "bg-accent-soft" : "border border-line"
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
              <Link
                href={plan === "free" ? "/signup" : `/app/billing?plan=${plan}&interval=${interval}`}
                className={`mt-6 rounded-full px-5 py-2.5 text-center text-sm font-medium transition-transform active:scale-[0.97] ${
                  highlight
                    ? "bg-accent text-accent-ink"
                    : "border border-line text-ink hover:border-faint"
                }`}
              >
                {plan === "free" ? "Start free" : `Go ${info.name}`}
              </Link>
            </div>
          );
        })}
      </div>

      {/* Full comparison table */}
      <PlanComparisonTable />

      {/* Roadmap teaser */}
      <div className="rounded-2xl border border-dashed border-line p-6 sm:p-8">
        <h3 className="font-semibold tracking-tight">Also on the roadmap</h3>
        <p className="mt-1 text-sm text-muted">
          Shipping soon, across every plan once ready.
        </p>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {ROADMAP.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-muted">
              <span className="mt-2 size-1 shrink-0 rounded-full bg-faint" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
