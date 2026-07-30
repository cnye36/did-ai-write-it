"use client";

import { useCallback, useRef, type RefObject } from "react";
import type { ResolvedSentence } from "@/lib/winston-sentences";

/*
  A textarea cannot render inline color, so this is the standard mirrored
  overlay: an aria-hidden div paints the colored <mark> segments and a
  transparent-text textarea sits on top of it, keeping native typing,
  selection, undo, and the selectionStart/End offsets the rewrite-suggest
  feature depends on.

  The two layers MUST share an identical box model. Any difference in padding,
  font, size, line-height, or wrapping makes the colors drift away from the
  glyphs, so both use SHARED_BOX below rather than their own class lists.
*/
const SHARED_BOX =
  "w-full whitespace-pre-wrap break-words p-4 text-sm leading-relaxed font-sans";

interface Segment {
  key: string;
  text: string;
  severity?: string;
  estimated?: boolean;
  title?: string;
}

function buildSegments(value: string, sentences: ResolvedSentence[]): Segment[] {
  const segments: Segment[] = [];
  let cursor = 0;
  sentences.forEach((s, i) => {
    if (s.start > cursor) {
      segments.push({ key: `gap-${i}`, text: value.slice(cursor, s.start) });
    }
    // Slice from the live value rather than trusting s.text, so a stale offset
    // can never render text that isn't actually in the box.
    segments.push({
      key: `s-${i}`,
      text: value.slice(s.start, s.end),
      severity: s.verdict,
      estimated: s.source === "estimated",
      title:
        s.source === "verified"
          ? `${s.score}/100 human, verified${s.reasons.length ? ` · ${s.reasons.join("; ")}` : ""}`
          : `${s.score}/100 human, estimate${s.reasons.length ? ` · ${s.reasons.join("; ")}` : ""}`,
    });
    cursor = s.end;
  });
  if (cursor < value.length) segments.push({ key: "tail", text: value.slice(cursor) });
  return segments;
}

export function HighlightedTextarea({
  value,
  onChange,
  sentences,
  textareaRef,
  onSelectionChange,
  ariaLabel,
  rows = 14,
  className = "",
}: {
  value: string;
  onChange: (next: string) => void;
  sentences: ResolvedSentence[];
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  onSelectionChange?: () => void;
  ariaLabel: string;
  rows?: number;
  className?: string;
}) {
  const mirrorRef = useRef<HTMLDivElement>(null);

  const syncScroll = useCallback(() => {
    const ta = textareaRef.current;
    const mirror = mirrorRef.current;
    if (!ta || !mirror) return;
    mirror.scrollTop = ta.scrollTop;
    mirror.scrollLeft = ta.scrollLeft;
  }, [textareaRef]);

  const segments = buildSegments(value, sentences);

  return (
    <div className={`relative ${className}`}>
      <div
        ref={mirrorRef}
        aria-hidden
        className={`pointer-events-none absolute inset-0 overflow-hidden text-ink ${SHARED_BOX}`}
      >
        {segments.map((seg) =>
          seg.severity ? (
            <mark
              key={seg.key}
              data-severity={seg.severity}
              data-confidence={seg.estimated ? "estimated" : undefined}
              title={seg.title}
            >
              {seg.text}
            </mark>
          ) : (
            <span key={seg.key}>{seg.text}</span>
          )
        )}
        {/* A value ending in a newline leaves the textarea one line taller than
            the mirror; this keeps the last line's height in sync. */}
        {value.endsWith("\n") && "​"}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={syncScroll}
        onSelect={onSelectionChange}
        onMouseUp={onSelectionChange}
        onKeyUp={onSelectionChange}
        rows={rows}
        aria-label={ariaLabel}
        spellCheck
        className={`relative resize-none bg-transparent text-transparent caret-[var(--ink)] outline-none ${SHARED_BOX}`}
      />
    </div>
  );
}
