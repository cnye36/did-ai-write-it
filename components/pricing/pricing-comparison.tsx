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
    title: "Usage",
    rows: [
      { label: "Humanized words / month", values: ["500", "10,000", "30,000", "100,000"] },
      { label: "Max words per request", values: ["300", "800", "1,500", "2,500"] },
      { label: "AI detection scans", values: ["Unlimited", "Unlimited", "Unlimited", "Unlimited"] },
    ],
  },
  {
    title: "Humanizing engine",
    rows: [
      { label: "Rewrites until it reads human", values: [true, true, true, true] },
      { label: "Priority processing", values: [false, false, true, true] },
      {
        label: "Multi-language humanizing (Spanish, French, German, Portuguese, more)",
        values: [false, true, true, true],
        comingSoon: true,
      },
      {
        label: "Guaranteed pass on GPTZero, Originality, and Turnitin",
        values: [false, false, false, true],
        comingSoon: true,
      },
    ],
  },
  {
    title: "Detection and reports",
    rows: [
      { label: "Instant AI-detection score", values: [true, true, true, true] },
      { label: "Full signal breakdown", values: [true, true, true, true] },
      {
        label: "Real detector pass reports (GPTZero, Originality)",
        values: [false, false, false, true],
        comingSoon: true,
      },
    ],
  },
  {
    title: "Platform",
    rows: [{ label: "API access", values: [false, false, false, true], comingSoon: true }],
  },
];

const ROADMAP = [
  ".docx and .pdf upload, not just plain text",
  "Bulk humanizing: queue up a whole folder of drafts at once",
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
