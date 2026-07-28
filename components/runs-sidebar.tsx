"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ClockCounterClockwiseIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  RUN_KIND_HREF,
  RUN_KIND_LABEL,
  type RunKind,
  type RunListItem,
} from "@/lib/runs";

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function scoreTone(kind: RunKind, score: number | null): string {
  if (score == null) return "text-faint";
  if (kind === "plagiarism") {
    if (score <= 20) return "text-good";
    if (score <= 50) return "text-warn";
    return "text-bad";
  }
  if (score >= 75) return "text-good";
  if (score >= 55) return "text-warn";
  return "text-bad";
}

export function RunsSidebar({ runs }: { runs: RunListItem[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const activeId = searchParams.get("run");
  const newCheckHref =
    pathname?.startsWith("/app/plagiarism")
      ? "/app/plagiarism"
      : pathname?.startsWith("/app/fact-check")
        ? "/app/fact-check"
        : "/app/detect";

  function selectRun(run: RunListItem) {
    setMobileOpen(false);
    router.push(`${RUN_KIND_HREF[run.kind]}?run=${run.id}`);
  }

  async function deleteRun(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/runs?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) return;
      if (activeId === id) {
        const base = pathname?.startsWith("/app/") ? pathname : "/app/detect";
        router.replace(base);
      }
      startTransition(() => router.refresh());
    } finally {
      setDeletingId(null);
    }
  }

  const panel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <ClockCounterClockwiseIcon size={16} weight="bold" className="text-muted" />
          <h2 className="text-sm font-semibold tracking-tight">Reports</h2>
          {runs.length > 0 && (
            <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] tabular-nums text-faint">
              {runs.length}
            </span>
          )}
        </div>
        <button
          type="button"
          className="rounded-full p-1 text-faint hover:text-ink md:hidden"
          aria-label="Close reports"
          onClick={() => setMobileOpen(false)}
        >
          <XIcon size={16} weight="bold" />
        </button>
      </div>

      <div className={`min-h-0 flex-1 overflow-y-auto ${pending ? "opacity-60" : ""}`}>
        {runs.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <ClockCounterClockwiseIcon size={28} className="mx-auto text-faint" weight="duotone" />
            <p className="mt-3 text-sm font-medium text-ink">No reports yet</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              Every verified check you run is saved here so you can reopen the full breakdown later.
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5 p-2">
            {runs.map((run) => {
              const active = run.id === activeId;
              return (
                <li key={run.id} className="group relative">
                  <button
                    type="button"
                    onClick={() => selectRun(run)}
                    className={`w-full rounded-[10px] px-3 py-2.5 pr-9 text-left transition-colors ${
                      active ? "bg-accent-soft" : "hover:bg-surface"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
                        {RUN_KIND_LABEL[run.kind]}
                      </span>
                      <span className="text-[11px] text-faint">·</span>
                      <span className="text-[11px] text-faint">{relativeTime(run.created_at)}</span>
                      {run.score != null && (
                        <span
                          className={`ml-auto font-mono text-[11px] tabular-nums ${scoreTone(run.kind, run.score)}`}
                        >
                          {run.score}
                        </span>
                      )}
                    </div>
                    <p
                      className={`mt-1 line-clamp-2 text-sm leading-snug ${active ? "text-ink" : "text-muted"}`}
                    >
                      {run.title}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] tabular-nums text-faint">
                      {run.word_count.toLocaleString()} words
                    </p>
                  </button>
                  <button
                    type="button"
                    aria-label="Delete report"
                    disabled={deletingId === run.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      void deleteRun(run.id);
                    }}
                    className="absolute right-2 top-2 rounded-full p-1.5 text-faint opacity-0 transition-opacity hover:bg-bad-soft hover:text-bad group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
                  >
                    <TrashIcon size={14} weight="bold" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <div className="border-t border-line p-3">
        <Link
          href={newCheckHref}
          onClick={() => setMobileOpen(false)}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-line px-3 py-2 text-sm font-medium text-ink transition-colors hover:border-faint"
        >
          <MagnifyingGlassIcon size={14} weight="bold" />
          New check
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <div className="border-b border-line bg-raised px-4 py-2 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <ClockCounterClockwiseIcon size={14} weight="bold" />
          Reports
          {runs.length > 0 && (
            <span className="font-mono text-[11px] tabular-nums text-faint">{runs.length}</span>
          )}
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close reports overlay"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col border-r border-line bg-raised shadow-xl">
            {panel}
          </aside>
        </div>
      )}

      <aside className="hidden w-72 shrink-0 border-r border-line bg-raised md:block">
        <div className="sticky top-14 h-[calc(100dvh-3.5rem)]">{panel}</div>
      </aside>
    </>
  );
}
