"use client";

import {
  ArrowSquareOutIcon,
  CheckCircleIcon,
  QuestionIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import type { FactCheckClaim, FactCheckVerdict } from "@/lib/winston";

const VERDICT_META: Record<FactCheckVerdict, { label: string; color: string; bg: string; icon: typeof CheckCircleIcon }> = {
  SUPPORTED: { label: "Supported", color: "var(--good)", bg: "var(--good-soft)", icon: CheckCircleIcon },
  PARTIALLY_SUPPORTED: {
    label: "Partially supported",
    color: "var(--warn)",
    bg: "var(--warn-soft)",
    icon: WarningCircleIcon,
  },
  NOT_ENOUGH_EVIDENCE: {
    label: "Not enough evidence",
    color: "var(--faint)",
    bg: "var(--raised)",
    icon: QuestionIcon,
  },
  REFUTED: { label: "Refuted", color: "var(--bad)", bg: "var(--bad-soft)", icon: XCircleIcon },
};

export function FactCheckClaims({ claims }: { claims: FactCheckClaim[] }) {
  if (claims.length === 0) {
    return <p className="text-sm text-muted">No checkable factual claims found.</p>;
  }

  return (
    <ul className="space-y-4">
      {claims.map((c, i) => {
        const meta = VERDICT_META[c.verdict];
        const Icon = meta.icon;
        return (
          <li key={i} className="rounded-2xl border border-line p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium leading-relaxed">{c.claim}</p>
              <span
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                style={{ background: meta.bg, color: meta.color }}
              >
                <Icon size={13} weight="bold" />
                {meta.label}
              </span>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-muted">{c.explanation}</p>
            {c.links.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                {c.links.map((link, j) => (
                  <li key={j}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-accent hover:underline"
                    >
                      {link.title || link.url}
                      <ArrowSquareOutIcon size={12} weight="bold" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
