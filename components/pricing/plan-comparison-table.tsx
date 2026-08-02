"use client";

import Link from "next/link";
import { CheckIcon, MinusIcon } from "@phosphor-icons/react";
import { PLAN_INFO, PLAN_ORDER } from "@/lib/plans";

type CellValue = boolean | string;

interface ComparisonRow {
  label: string;
  values: [CellValue, CellValue, CellValue, CellValue];
  comingSoon?: boolean;
  /** Small print shown next to the label, e.g. a per-word credit cost. */
  note?: string;
}

interface ComparisonGroup {
  title: string;
  /** Links the group title to a marketing page with more detail, e.g. Revision History. */
  href?: string;
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
    title: "Revision History",
    href: "/revision-history",
    rows: [
      {
        label: "AI-suggested rewrites for flagged sentences",
        values: [true, true, true, true],
        note: "2 credits/word",
      },
      { label: "Rescan for a new verified score, as many times as you want", values: [true, true, true, true] },
      { label: "Full version history with side-by-side diffs", values: [true, true, true, true] },
    ],
  },
  {
    title: "Plagiarism & fact checking",
    rows: [
      {
        label: "Web-wide plagiarism scan with matched sources",
        values: [true, true, true, true],
        note: "2 credits/word",
      },
      {
        label: "Claim-by-claim fact check with cited sources",
        values: [true, true, true, true],
        note: "2 credits/word",
      },
    ],
  },
  {
    title: "Usage",
    rows: [{ label: "Credits / month", values: ["2,000", "40,000", "150,000", "500,000"] }],
  },
  {
    title: "Platform",
    rows: [
      { label: "Priority processing", values: [false, false, true, true] },
      { label: "API access", values: [false, false, false, true], comingSoon: true },
    ],
  },
];

function Cell({ value }: { value: CellValue }) {
  if (typeof value === "boolean") {
    return value ? (
      <CheckIcon size={18} weight="bold" className="mx-auto text-accent" />
    ) : (
      <MinusIcon size={14} weight="bold" className="mx-auto text-faint" />
    );
  }
  return <span className="font-mono text-sm tabular-nums">{value}</span>;
}

export function PlanComparisonTable() {
  return (
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
                {group.href ? (
                  <Link href={group.href} className="hover:text-accent">
                    {group.title}
                  </Link>
                ) : (
                  group.title
                )}
              </td>
            </tr>
            {group.rows.map((row) => (
              <tr key={row.label} className="border-t border-line">
                <td className="py-3 pr-4 text-muted">
                  {row.label}
                  {row.note && <span className="ml-2 text-[11px] text-faint">({row.note})</span>}
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
  );
}
