"use client";

import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import type { PlagiarismSource } from "@/lib/winston";

export function PlagiarismSources({ sources }: { sources: PlagiarismSource[] }) {
  if (sources.length === 0) {
    return <p className="text-sm text-muted">No matching sources found.</p>;
  }

  return (
    <ul className="space-y-3">
      {sources.map((s, i) => (
        <li key={i} className="flex items-start gap-3 text-sm">
          <span
            className="mt-0.5 shrink-0 rounded-full px-2 py-0.5 font-mono text-xs tabular-nums"
            style={{ background: "var(--bad-soft)", color: "var(--bad)" }}
          >
            {Math.round(s.score)}%
          </span>
          <div className="min-w-0 flex-1">
            <a
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-ink hover:text-accent"
            >
              <span className="truncate">{s.title || s.url}</span>
              <ArrowSquareOutIcon size={13} weight="bold" className="shrink-0 text-faint" />
            </a>
            <p className="mt-0.5 text-xs text-faint">
              {s.plagiarismWords.toLocaleString()} of {s.totalNumberOfWords.toLocaleString()} words matched
              {s.author && ` · ${s.author}`}
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
