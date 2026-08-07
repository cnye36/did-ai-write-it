"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FileMagnifyingGlassIcon,
  ListIcon,
  MagnifyingGlassIcon,
  SquaresFourIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import { RUN_KIND_HREF, RUN_KIND_LABEL, formatRunDateTime, type RunKind, type RunListItem } from "@/lib/runs";
import { TONE_CLASSES, scoreBadge } from "@/lib/run-badge";
import type { RunSort } from "@/lib/load-run";

const SORT_LABEL: Record<RunSort, string> = {
  newest: "Newest first",
  oldest: "Oldest first",
  score_desc: "Highest score",
  score_asc: "Lowest score",
};

const TABS: { kind: RunKind | undefined; label: string }[] = [
  { kind: undefined, label: "All" },
  { kind: "detect", label: "AI Detector" },
  { kind: "plagiarism", label: "Plagiarism" },
  { kind: "fact_check", label: "Fact Check" },
];

type View = "grid" | "list";

export function ReportsPageClient({
  runs,
  total,
  counts,
  pageSize,
  query,
}: {
  runs: RunListItem[];
  total: number;
  counts: Record<"all" | RunKind, number>;
  pageSize: number;
  query: { kind?: RunKind; q: string; sort: RunSort; page: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [searchValue, setSearchValue] = useState(query.q);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [view, setView] = useState<View>("grid");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the input in sync when `query.q` changes from outside our own typing
  // (e.g. browser back/forward), without an effect: adjusting state during
  // render is React's documented pattern for "reset state when a prop changes".
  const [prevQ, setPrevQ] = useState(query.q);
  if (query.q !== prevQ) {
    setPrevQ(query.q);
    setSearchValue(query.q);
  }

  function navigate(next: Partial<{ kind?: RunKind; q: string; sort: RunSort; page: number }>) {
    const merged = { ...query, ...next };
    const params = new URLSearchParams();
    if (merged.kind) params.set("kind", merged.kind);
    if (merged.q) params.set("q", merged.q);
    if (merged.sort !== "newest") params.set("sort", merged.sort);
    if (merged.page > 1) params.set("page", String(merged.page));
    const qs = params.toString();
    startTransition(() => router.push(qs ? `/app/reports?${qs}` : "/app/reports"));
  }

  function onSearchChange(value: string) {
    setSearchValue(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ q: value, page: 1 }), 350);
  }

  async function deleteRun(id: string) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/runs?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) return;
      startTransition(() => router.refresh());
    } finally {
      setDeletingId(null);
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const rangeStart = total === 0 ? 0 : (query.page - 1) * pageSize + 1;
  const rangeEnd = Math.min(total, query.page * pageSize);
  const hasFilters = Boolean(query.kind || query.q);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Reports</h1>
        <p className="mt-1 text-sm text-muted">
          Every verified check you&rsquo;ve run, searchable and filterable in one place.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {TABS.map((tab) => {
            const active = query.kind === tab.kind;
            const count = counts[tab.kind ?? "all"];
            return (
              <button
                key={tab.label}
                type="button"
                onClick={() => navigate({ kind: tab.kind, page: 1 })}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                  active ? "bg-accent-soft text-accent" : "text-muted hover:bg-surface hover:text-ink"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 font-mono text-[10px] tabular-nums ${
                    active ? "bg-accent/15 text-accent" : "bg-surface text-faint"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <MagnifyingGlassIcon
              size={14}
              weight="bold"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              type="text"
              value={searchValue}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search by title"
              aria-label="Search reports"
              className="w-full rounded-[10px] border border-line bg-surface py-2 pl-8 pr-7 text-sm text-ink outline-none placeholder:text-faint focus:border-accent sm:w-56"
            />
            {searchValue && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
              >
                <XIcon size={13} weight="bold" />
              </button>
            )}
          </div>
          <select
            value={query.sort}
            onChange={(e) => navigate({ sort: e.target.value as RunSort, page: 1 })}
            aria-label="Sort reports"
            className="rounded-[10px] border border-line bg-surface px-2.5 py-2 text-sm text-ink outline-none transition-colors focus:border-accent"
          >
            {(Object.keys(SORT_LABEL) as RunSort[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABEL[s]}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-0.5 rounded-full border border-line bg-surface p-0.5">
            <button
              type="button"
              onClick={() => setView("grid")}
              aria-label="Grid view"
              aria-pressed={view === "grid"}
              className={`rounded-full p-1.5 transition-colors ${
                view === "grid" ? "bg-raised text-ink shadow-sm" : "text-faint hover:text-ink"
              }`}
            >
              <SquaresFourIcon size={15} weight="bold" />
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              aria-label="List view"
              aria-pressed={view === "list"}
              className={`rounded-full p-1.5 transition-colors ${
                view === "list" ? "bg-raised text-ink shadow-sm" : "text-faint hover:text-ink"
              }`}
            >
              <ListIcon size={15} weight="bold" />
            </button>
          </div>
        </div>
      </div>

      <div className={`transition-opacity ${pending ? "opacity-60" : ""}`}>
        {runs.length === 0 ? (
          <div className="rounded-2xl border border-line bg-raised px-6 py-16 text-center">
            <FileMagnifyingGlassIcon size={32} className="mx-auto text-faint" weight="duotone" />
            <p className="mt-3 text-sm font-medium text-ink">
              {hasFilters ? "No reports match" : "No reports yet"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-muted">
              {hasFilters
                ? "Try a different search term, or clear the filter to see everything."
                : "Every verified check you run is saved here so you can reopen the full breakdown later."}
            </p>
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {runs.map((run) => {
              const badge = scoreBadge(run.kind, run.score);
              return (
                <div key={run.id} className="group relative">
                  <Link
                    href={`${RUN_KIND_HREF[run.kind]}?run=${run.id}`}
                    className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-line bg-raised p-4 transition-colors hover:border-faint hover:bg-surface"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 pr-6">
                        <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
                          {RUN_KIND_LABEL[run.kind]}
                        </span>
                        <span className="text-[11px] text-faint">&middot;</span>
                        <span className="text-[11px] text-faint">
                          {formatRunDateTime(run.updated_at ?? run.created_at)}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm font-medium leading-snug text-ink" title={run.title}>
                        {run.title}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[11px] tabular-nums text-faint">
                        {run.word_count.toLocaleString()} words
                      </span>
                      {badge && run.score !== null && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 font-mono text-xs font-semibold tabular-nums ${TONE_CLASSES[badge.tone]}`}
                          title={badge.label}
                        >
                          {run.kind === "detect" ? badge.label : run.score}
                        </span>
                      )}
                    </div>
                  </Link>
                  <button
                    type="button"
                    aria-label="Delete report"
                    disabled={deletingId === run.id}
                    onClick={(e) => {
                      e.preventDefault();
                      void deleteRun(run.id);
                    }}
                    className="absolute right-2.5 top-2.5 rounded-full bg-raised p-1.5 text-faint opacity-0 shadow-sm transition-opacity hover:bg-bad-soft hover:text-bad group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
                  >
                    <TrashIcon size={13} weight="bold" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-raised">
            <ul className="divide-y divide-line">
              {runs.map((run) => {
                const badge = scoreBadge(run.kind, run.score);
                return (
                  <li key={run.id} className="group relative">
                    <Link
                      href={`${RUN_KIND_HREF[run.kind]}?run=${run.id}`}
                      className="flex items-center gap-4 px-4 py-3.5 pr-12 transition-colors hover:bg-surface sm:px-5"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-medium uppercase tracking-wide text-faint">
                            {RUN_KIND_LABEL[run.kind]}
                          </span>
                          <span className="text-[11px] text-faint">&middot;</span>
                          <span className="text-[11px] text-faint">
                            {formatRunDateTime(run.updated_at ?? run.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-sm font-medium text-ink" title={run.title}>
                          {run.title}
                        </p>
                      </div>
                      <span className="hidden shrink-0 font-mono text-xs tabular-nums text-faint sm:block">
                        {run.word_count.toLocaleString()} words
                      </span>
                      {badge && run.score !== null && (
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 font-mono text-xs font-semibold tabular-nums ${TONE_CLASSES[badge.tone]}`}
                          title={badge.label}
                        >
                          {run.kind === "detect" ? badge.label : run.score}
                        </span>
                      )}
                    </Link>
                    <button
                      type="button"
                      aria-label="Delete report"
                      disabled={deletingId === run.id}
                      onClick={(e) => {
                        e.preventDefault();
                        void deleteRun(run.id);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-faint opacity-0 transition-opacity hover:bg-bad-soft hover:text-bad group-hover:opacity-100 focus-visible:opacity-100 disabled:opacity-40"
                    >
                      <TrashIcon size={14} weight="bold" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted">
          <span>
            Showing <span className="font-medium text-ink">{rangeStart}</span>
            {"-"}
            <span className="font-medium text-ink">{rangeEnd}</span> of{" "}
            <span className="font-medium text-ink">{total}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={query.page <= 1}
              onClick={() => navigate({ page: query.page - 1 })}
              aria-label="Previous page"
              className="rounded-full border border-line p-2 text-muted transition-colors hover:border-faint hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowLeftIcon size={14} weight="bold" />
            </button>
            <span className="px-1 text-xs text-faint">
              Page {query.page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={query.page >= totalPages}
              onClick={() => navigate({ page: query.page + 1 })}
              aria-label="Next page"
              className="rounded-full border border-line p-2 text-muted transition-colors hover:border-faint hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowRightIcon size={14} weight="bold" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
