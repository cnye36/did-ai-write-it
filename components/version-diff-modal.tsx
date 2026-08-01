"use client";

import { Fragment, useMemo } from "react";
import { Modal } from "@/components/modal";
import { diffText, type DiffEntry } from "@/lib/diff";
import { formatRunDateTime } from "@/lib/runs";

export interface DiffSide {
  label: string;
  text: string;
  score: number | null;
  createdAt: string;
}

export interface DiffFromOption extends DiffSide {
  value: string;
}

function ScoreDelta({ from, to }: { from: number | null; to: number | null }) {
  if (from == null || to == null) return null;
  const delta = to - from;
  const tone = delta > 0 ? "text-good" : delta < 0 ? "text-bad" : "text-faint";
  return (
    <span className={`font-mono text-xs tabular-nums ${tone}`}>
      {delta >= 0 ? "+" : ""}
      {delta}
    </span>
  );
}

function BeforeCell({ entry }: { entry: DiffEntry }) {
  if (entry.kind === "added") {
    return <span className="text-faint/50">·</span>;
  }
  if (entry.kind === "changed") {
    return (
      <>
        {entry.wordDiff!
          .filter((p) => !p.added)
          .map((p, i) => (
            <span key={i} className={p.removed ? "bg-bad-soft text-bad line-through decoration-bad/50" : "text-ink"}>
              {p.value}
            </span>
          ))}
      </>
    );
  }
  return <span className={entry.kind === "removed" ? "text-bad line-through decoration-bad/50" : "text-ink"}>{entry.before}</span>;
}

function AfterCell({ entry }: { entry: DiffEntry }) {
  if (entry.kind === "removed") {
    return <span className="text-faint/50">·</span>;
  }
  if (entry.kind === "changed") {
    return (
      <>
        {entry.wordDiff!
          .filter((p) => !p.removed)
          .map((p, i) => (
            <span key={i} className={p.added ? "bg-good-soft text-good" : "text-ink"}>
              {p.value}
            </span>
          ))}
      </>
    );
  }
  return <span className={entry.kind === "added" ? "text-good" : "text-ink"}>{entry.after}</span>;
}

const ROW_BG: Record<DiffEntry["kind"], string> = {
  unchanged: "",
  added: "bg-good-soft/50",
  removed: "bg-bad-soft/50",
  changed: "bg-surface",
};

/** Side-by-side "code IDE" style diff between two saved reports (or a saved
 *  report and the current live edit). `fromOptions` always includes the
 *  original (version 1) so a user can always compare back to it, not just to
 *  the immediately preceding report. */
export function VersionDiffModal({
  open,
  onClose,
  to,
  fromOptions,
  fromValue,
  onFromChange,
}: {
  open: boolean;
  onClose: () => void;
  to: DiffSide;
  fromOptions: DiffFromOption[];
  fromValue: string;
  onFromChange: (value: string) => void;
}) {
  const from = fromOptions.find((o) => o.value === fromValue) ?? fromOptions[0];
  // Gated on `open` so an expensive re-diff doesn't run on every keystroke of
  // a live draft (`to.text`) while the modal is closed.
  const diff = useMemo(
    () => (open && from ? diffText(from.text, to.text) : null),
    [open, from, to.text]
  );

  const wordDelta = diff ? diff.summary.wordsAfter - diff.summary.wordsBefore : 0;

  return (
    <Modal open={open} onClose={onClose} className="max-w-5xl">
      {from && diff && (
      <div className="flex max-h-[85vh] flex-col">
        <div className="border-b border-line px-6 py-4 pr-14">
          <h2 className="text-lg font-semibold tracking-tight">Compare reports</h2>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
            <select
              value={fromValue}
              onChange={(e) => onFromChange(e.target.value)}
              className="rounded-[10px] border border-line bg-surface px-2.5 py-1.5 text-sm outline-none transition-colors focus:border-accent"
            >
              {fromOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <span className="text-faint">→</span>
            <span className="font-medium text-ink">{to.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 border-b border-line px-6 py-3 text-xs">
          <div>
            <p className="font-medium text-ink">{from.label}</p>
            <p className="mt-0.5 text-faint">{formatRunDateTime(from.createdAt)}</p>
          </div>
          <div>
            <p className="font-medium text-ink">{to.label}</p>
            <p className="mt-0.5 text-faint">{formatRunDateTime(to.createdAt)}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4 border-b border-line bg-surface px-6 py-2.5 text-xs text-muted">
          <span>
            <span className="text-good">+{diff.summary.added}</span> added
          </span>
          <span>
            <span className="text-bad">-{diff.summary.removed}</span> removed
          </span>
          <span>{diff.summary.changed} rewritten</span>
          <span>{diff.summary.unchanged} unchanged</span>
          <span className="ml-auto flex items-center gap-1.5">
            {diff.summary.wordsBefore.toLocaleString()} → {diff.summary.wordsAfter.toLocaleString()} words
            <span className={wordDelta === 0 ? "text-faint" : wordDelta > 0 ? "text-good" : "text-bad"}>
              ({wordDelta >= 0 ? "+" : ""}
              {wordDelta})
            </span>
          </span>
          {(from.score != null || to.score != null) && (
            <span className="flex items-center gap-1.5">
              score {from.score ?? "—"} → {to.score ?? "—"}
              <ScoreDelta from={from.score} to={to.score} />
            </span>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {diff.entries.length === 0 ? (
            <p className="text-sm text-muted">No text to compare.</p>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm leading-relaxed">
              {diff.entries.map((entry, i) => (
                <Fragment key={i}>
                  <div className={`rounded-[6px] px-2.5 py-1.5 ${ROW_BG[entry.kind]}`}>
                    <BeforeCell entry={entry} />
                  </div>
                  <div className={`rounded-[6px] px-2.5 py-1.5 ${ROW_BG[entry.kind]}`}>
                    <AfterCell entry={entry} />
                  </div>
                </Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
      )}
    </Modal>
  );
}
