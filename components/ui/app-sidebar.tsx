"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckIcon,
  ClockCounterClockwiseIcon,
  FunnelIcon,
  GearIcon,
  ListIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  XIcon,
} from "@phosphor-icons/react";
import {
  RUN_KIND_HREF,
  RUN_KIND_LABEL,
  type RunKind,
  type RunListItem,
} from "@/lib/runs";
import { BrandLink } from "@/components/marketing/brand-link";
import { UserNav } from "@/components/auth/user-nav";
import { FeedbackWidget } from "@/components/feedback-widget";
import type { Plan } from "@/lib/usage";
import { verdictFor } from "@/lib/detector";
import { plagiarismVerdict, factCheckVerdict } from "@/lib/score-verdicts";

const NAV_LINKS: { href: string; label: string; kind: RunKind }[] = [
  { href: "/app/detect", label: "Detector", kind: "detect" },
  { href: "/app/plagiarism", label: "Plagiarism", kind: "plagiarism" },
  { href: "/app/fact-check", label: "Fact Check", kind: "fact_check" },
];

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

type Tone = "good" | "warn" | "bad";

const TONE_CLASSES: Record<Tone, string> = {
  good: "bg-good-soft text-good",
  warn: "bg-warn-soft text-warn",
  bad: "bg-bad-soft text-bad",
};

function toneFromColor(color: string): Tone {
  return color === "var(--good)" ? "good" : color === "var(--warn)" ? "warn" : "bad";
}

const TONE_LABEL: Record<Tone, string> = { good: "Pass", warn: "Mixed", bad: "Fail" };

/** Compact pass/mixed/fail badge for the sidebar, reusing each kind's own
 *  canonical verdict thresholds (lib/detector's verdictFor, lib/score-verdicts)
 *  instead of a raw 0-100 score, which doesn't scan well in a short list row. */
function scoreBadge(kind: RunKind, score: number | null): { label: string; tone: Tone } | null {
  if (score == null) return null;
  let tone: Tone;
  if (kind === "plagiarism") {
    tone = toneFromColor(plagiarismVerdict(score).color);
  } else if (kind === "fact_check") {
    tone = toneFromColor(factCheckVerdict(score).color);
  } else {
    const verdict = verdictFor(score);
    tone = verdict === "human" ? "good" : verdict === "mixed" ? "warn" : "bad";
  }
  return { label: TONE_LABEL[tone], tone };
}

function FilterMenu({
  active,
  onToggle,
  onClear,
}: {
  active: Set<RunKind>;
  onToggle: (kind: RunKind) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Filter reports"
        className={`rounded-full p-1.5 transition-colors ${
          active.size > 0 ? "text-accent" : "text-faint hover:text-ink"
        }`}
      >
        <FunnelIcon size={15} weight={active.size > 0 ? "fill" : "bold"} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-8 z-20 w-44 overflow-hidden rounded-[10px] border border-line bg-raised shadow-xl"
        >
          {NAV_LINKS.map((link) => (
            <button
              key={link.kind}
              type="button"
              role="menuitemcheckbox"
              aria-checked={active.has(link.kind)}
              onClick={() => onToggle(link.kind)}
              className="flex w-full items-center justify-between px-3 py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              {link.label}
              {active.has(link.kind) && <CheckIcon size={14} weight="bold" className="text-accent" />}
            </button>
          ))}
          {active.size > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="w-full border-t border-line px-3 py-2 text-left text-xs text-faint transition-colors hover:text-ink"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function AppSidebar({
  runs,
  email,
  plan,
  wordsUsed,
  wordLimit,
  isAdmin,
}: {
  runs: RunListItem[];
  email: string;
  plan: Plan;
  wordsUsed: number;
  wordLimit: number;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Set<RunKind>>(new Set());
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();

  const activeId = searchParams.get("run");
  // "New" always starts a fresh check on whichever tool is currently open,
  // falling back to the detector when the sidebar shows on a non-tool page.
  const newReportHref = NAV_LINKS.find((l) => pathname?.startsWith(l.href))?.href ?? "/app/detect";
  const trimmedQuery = query.trim().toLowerCase();
  const visibleRuns = runs
    .filter((r) => filters.size === 0 || filters.has(r.kind))
    .filter((r) => trimmedQuery === "" || r.title.toLowerCase().includes(trimmedQuery));
  const usagePct = wordLimit > 0 ? Math.min(100, (wordsUsed / wordLimit) * 100) : 0;

  function toggleFilter(kind: RunKind) {
    setFilters((prev) => {
      const next = new Set(prev);
      if (next.has(kind)) next.delete(kind);
      else next.add(kind);
      return next;
    });
  }

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
      <div className="px-4 py-4">
        <BrandLink onClick={() => setMobileOpen(false)} />
      </div>
      <div className="border-b border-line" />

      <nav className="flex flex-col gap-0.5 p-3">
        {NAV_LINKS.map((link) => {
          const active = pathname?.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className={`rounded-[10px] px-3 py-2 text-sm transition-colors ${
                active ? "bg-accent-soft font-medium text-accent" : "text-muted hover:bg-surface hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-2 rounded-[10px] px-3 py-2 text-sm transition-colors ${
              pathname?.startsWith("/admin")
                ? "bg-accent-soft font-medium text-accent"
                : "text-muted hover:bg-surface hover:text-ink"
            }`}
          >
            <GearIcon size={14} weight="bold" />
            Admin
          </Link>
        )}
        <FeedbackWidget onNavigate={() => setMobileOpen(false)} />
      </nav>

      <div className="flex items-center justify-between border-t border-line px-4 py-3">
        <div className="flex items-center gap-2">
          <ClockCounterClockwiseIcon size={16} weight="bold" className="text-muted" />
          <h2 className="text-sm font-semibold tracking-tight">Reports</h2>
          {visibleRuns.length > 0 && (
            <span className="rounded-full bg-surface px-2 py-0.5 font-mono text-[10px] tabular-nums text-faint">
              {visibleRuns.length}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Link
            href={newReportHref}
            onClick={() => setMobileOpen(false)}
            aria-label="New report"
            title="New report"
            className="rounded-full p-1.5 text-faint transition-colors hover:text-ink"
          >
            <PlusIcon size={15} weight="bold" />
          </Link>
          <FilterMenu active={filters} onToggle={toggleFilter} onClear={() => setFilters(new Set())} />
          <button
            type="button"
            className="rounded-full p-1 text-faint hover:text-ink md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          >
            <XIcon size={16} weight="bold" />
          </button>
        </div>
      </div>

      {runs.length > 0 && (
        <div className="px-3 pb-2">
          <div className="relative">
            <MagnifyingGlassIcon
              size={14}
              weight="bold"
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reports"
              aria-label="Search reports"
              className="w-full rounded-[10px] border border-line bg-surface py-1.5 pl-8 pr-7 text-xs text-ink outline-none placeholder:text-faint focus:border-faint"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
              >
                <XIcon size={12} weight="bold" />
              </button>
            )}
          </div>
        </div>
      )}

      <div className={`min-h-0 flex-1 overflow-y-auto ${pending ? "opacity-60" : ""}`}>
        {visibleRuns.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <ClockCounterClockwiseIcon size={28} className="mx-auto text-faint" weight="duotone" />
            <p className="mt-3 text-sm font-medium text-ink">
              {runs.length === 0 ? "No reports yet" : "No reports match"}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted">
              {runs.length === 0
                ? "Every verified check you run is saved here so you can reopen the full breakdown later."
                : "Try a different search term or filter."}
            </p>
          </div>
        ) : (
          <ul className="space-y-0.5 p-2">
            {visibleRuns.map((run) => {
              const active = run.id === activeId;
              const badge = scoreBadge(run.kind, run.score);
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
                      <span className="text-[11px] text-faint">{relativeTime(run.updated_at ?? run.created_at)}</span>
                      {badge && (
                        <span
                          className={`ml-auto rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASSES[badge.tone]}`}
                        >
                          {badge.label}
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

      <div className="border-t border-line">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between text-[11px] text-faint">
            <span>Usage</span>
            <span className="font-mono tabular-nums">
              {wordsUsed.toLocaleString()} / {wordLimit.toLocaleString()} credits
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
            <div className="h-full rounded-full bg-accent" style={{ width: `${usagePct}%` }} />
          </div>
        </div>
        <div className="border-t border-line p-3">
          <UserNav email={email} plan={plan} wordsUsed={wordsUsed} wordLimit={wordLimit} />
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between border-b border-line bg-raised px-4 py-2.5 md:hidden">
        <BrandLink />
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
          className="rounded-full p-1.5 text-muted transition-colors hover:text-ink"
        >
          <ListIcon size={20} weight="bold" />
        </button>
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Close menu overlay"
            className="absolute inset-0 bg-ink/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-[min(100%,20rem)] flex-col border-r border-line bg-raised shadow-xl">
            {panel}
          </aside>
        </div>
      )}

      <aside className="hidden w-72 shrink-0 border-r border-line bg-raised md:flex md:h-[100dvh] md:flex-col md:sticky md:top-0">
        {panel}
      </aside>
    </>
  );
}
