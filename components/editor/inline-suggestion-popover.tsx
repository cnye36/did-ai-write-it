"use client";

import { CheckIcon, SparkleIcon, XIcon } from "@phosphor-icons/react";

const POPOVER_WIDTH = 380;
const GAP = 8;
const EDGE_PADDING = 8;

export interface InlineSuggestionPopoverProps {
  anchorRect: DOMRect | null;
  sourceLabel: string;
  spanText: string;
  busy: boolean;
  error: string | null;
  texts: string[] | null;
  selectedIndex: number;
  onSelect: (index: number) => void;
  onAccept: () => void;
  onRetry: () => void;
  onDismiss: () => void;
}

/** A rewrite suggestion floats right at the sentence it's for, instead of in
 *  a block elsewhere on the page: this is the fix for "suggest a rewrite" so
 *  far being spatially disconnected from what it rewrites. Position is
 *  computed by the caller (RichEditorHandle.getRangeRect) and passed in as a
 *  plain viewport rect, so this component only does layout math, not any
 *  ProseMirror-position awareness of its own. */
export function InlineSuggestionPopover({
  anchorRect,
  sourceLabel,
  spanText,
  busy,
  error,
  texts,
  selectedIndex,
  onSelect,
  onAccept,
  onRetry,
  onDismiss,
}: InlineSuggestionPopoverProps) {
  if (!anchorRect) return null;

  const spaceBelow = window.innerHeight - anchorRect.bottom;
  const spaceAbove = anchorRect.top;
  const placeBelow = spaceBelow >= 260 || spaceBelow >= spaceAbove;
  const left = Math.min(
    Math.max(anchorRect.left, EDGE_PADDING),
    window.innerWidth - POPOVER_WIDTH - EDGE_PADDING
  );

  const style: React.CSSProperties = {
    position: "fixed",
    left,
    width: POPOVER_WIDTH,
    zIndex: 40,
    ...(placeBelow
      ? { top: anchorRect.bottom + GAP }
      : { bottom: window.innerHeight - anchorRect.top + GAP }),
  };

  return (
    <div
      id="inline-suggestion-popover"
      style={style}
      className="max-h-[70vh] overflow-y-auto rounded-2xl border border-line bg-raised p-3.5 shadow-xl"
    >
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-faint">
        <SparkleIcon size={12} weight="bold" />
        Rewrite for {sourceLabel}
      </p>
      <p className="mt-2 rounded-[10px] bg-surface p-2.5 text-xs leading-relaxed text-muted line-through decoration-faint">
        {spanText}
      </p>
      {busy ? (
        <div className="mt-2 space-y-1.5">
          <div className="h-8 animate-pulse rounded-[10px] bg-surface" />
          <div className="h-8 animate-pulse rounded-[10px] bg-surface" />
          <div className="h-8 animate-pulse rounded-[10px] bg-surface" />
        </div>
      ) : error ? (
        <p className="mt-2 text-xs text-bad">{error}</p>
      ) : (
        <div className="mt-2 space-y-1.5">
          {texts?.map((text, i) => (
            <button
              key={i}
              type="button"
              onClick={() => onSelect(i)}
              aria-pressed={i === selectedIndex}
              className={`w-full rounded-[10px] p-2.5 text-left text-xs leading-relaxed transition-colors ${
                i === selectedIndex
                  ? "bg-accent-soft ring-1 ring-inset ring-accent"
                  : "bg-surface hover:bg-accent-soft/60"
              }`}
            >
              {text}
            </button>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={busy || !texts?.[selectedIndex]}
          onClick={onAccept}
          className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckIcon size={12} weight="bold" />
          Use this
        </button>
        {!busy && (
          <button type="button" onClick={onRetry} className="text-xs font-medium text-muted hover:text-ink">
            Try again
          </button>
        )}
        <button
          type="button"
          onClick={onDismiss}
          className="ml-auto inline-flex items-center gap-1 text-xs text-faint hover:text-ink"
        >
          <XIcon size={11} weight="bold" />
          Dismiss
        </button>
      </div>
    </div>
  );
}
