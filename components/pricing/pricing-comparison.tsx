"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react";
import { PLAN_INFO, PLAN_ORDER, formatPlanPrice, priceForInterval, type BillingInterval } from "@/lib/plans";
import { IntervalToggle } from "@/components/billing/interval-toggle";

type Cell = boolean | string;

interface ComparisonRow {
  label: string;
  values: [Cell, Cell, Cell, Cell];
  comingSoon?: boolean;
}

interface ComparisonGroup {
  title: string;
  rows: ComparisonRow[];
}

const GROUPS: ComparisonGroup[] = [
  {
    title: "AI detection",
    rows: [
      { label: "Real, verified detection score", values: [true, true, true, true] },
      { label: "Full sentence-by-sentence report", values: [true, true, true, true] },
      { label: "Up to 150,000 characters per check", values: [true, true, true, true] },
      { label: "Submission and report history, saved to your account", values: [true, true, true, true] },
      {
        label: "Multi-provider detection (GPTZero, Turnitin, and more)",
        values: [false, false, false, true],
        comingSoon: true,
      },
    ],
  },
  {
    title: "Plagiarism & fact checking",
    rows: [
      { label: "Web-wide plagiarism scan with matched sources", values: [true, true, true, true] },
      { label: "Claim-by-claim fact check with cited sources", values: [true, true, true, true] },
    ],
  },
  {
    title: "Usage",
    rows: [{ label: "Words / month", values: ["2,000", "40,000", "150,000", "500,000"] }],
  },
  {
    title: "Platform",
    rows: [
      { label: "Priority processing", values: [false, false, true, true] },
      { label: "API access", values: [false, false, false, true], comingSoon: true },
    ],
  },
];

const ROADMAP = [
  "AI writing assistant: draft clean copy from scratch (coming soon)",
  "Humanizer: rewrite flagged text until it reads human (returning soon)",
  ".docx and .pdf upload, not just plain text",
  "Referral credits for teams that invite others",
];

function Cell({ value }: { value: Cell }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckIcon size={18} weight="bold" className="mx-auto text-accent" />
    ) : (
      <MinusIcon size={14} weight="bold" className="mx-auto text-faint" />
    );
  }
  return <span className="font-mono text-sm tabular-nums">{value}</span>;
}

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
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr>
              <th className="w-1/3 py-3 text-left text-xs font-medium uppercase tracking-wide text-faint">
                Feature
              </th>
              {PLAN_ORDER.map((plan) => (
                <th
                  key={plan}
                  className="py-3 text-center text-xs font-medium uppercase tracking-wide text-faint"
                >
                  {PLAN_INFO[plan].name}
                </th>
              ))}
            </tr>
          </thead>
          {GROUPS.map((group) => (
            <tbody key={group.title}>
              <tr>
                <td colSpan={5} className="pb-2 pt-6 text-sm font-semibold tracking-tight">
                  {group.title}
                </td>
              </tr>
              {group.rows.map((row) => (
                <tr key={row.label} className="border-t border-line">
                  <td className="py-3 pr-4 text-muted">
                    {row.label}
                    {row.comingSoon && (
                      <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                        Coming soon
                      </span>
                    )}
                  </td>
                  {row.values.map((v, i) => (
                    <td key={i} className="py-3 text-center">
                      <Cell value={v} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <p className="text-xs text-faint">
        Plagiarism and fact checks draw from the same monthly word pool as AI detection, at roughly
        twice the rate, since each one runs a real web search.
      </p>

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
