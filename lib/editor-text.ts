/*
  Bridge between the rich-text editor's document and the plain text everything
  else in the product speaks.

  lib/detector.ts and lib/winston.ts both take plain strings with character
  offsets, while the editor holds a ProseMirror document addressed by its own
  position space. Every highlight, every "rewrite this selection", and every
  scan crosses that boundary, so the mapping below is load-bearing: an
  off-by-one here puts highlights on the wrong words or sends the wrong span to
  be rewritten.
*/

import type { Node as PMNode } from "@tiptap/pm/model";

/** One run of text: contiguous in both coordinate spaces, so a single offset
 *  shift converts between them. */
export interface TextSegment {
  pmStart: number;
  textStart: number;
  length: number;
}

export interface PlainTextProjection {
  text: string;
  segments: TextSegment[];
}

/*
  Separators are plain newlines, never markdown. lib/detector.ts flags "# " and
  bold-led bullets as the raw ChatGPT export format, so projecting a heading the
  user legitimately typed as "# Heading" would make the product flag its own
  formatting as an AI tell. Paragraphs get a blank line between them because the
  detector's uniform-paragraph check splits on /\n\s*\n+/; list items get a
  single newline so a list doesn't read as a run of one-line paragraphs.
*/
function separatorFor(node: PMNode, parent: PMNode | null): string {
  return parent?.type.name === "listItem" ? "\n" : "\n\n";
}

export function docToPlainText(doc: PMNode): PlainTextProjection {
  let text = "";
  const segments: TextSegment[] = [];
  let seenTextblock = false;

  doc.descendants((node, pos, parent) => {
    if (node.isTextblock) {
      if (seenTextblock) text += separatorFor(node, parent);
      seenTextblock = true;
      return true;
    }
    if (node.isText && node.text) {
      segments.push({ pmStart: pos, textStart: text.length, length: node.text.length });
      text += node.text;
    }
    return true;
  });

  return { text, segments };
}

/**
 * Plain-text offset to ProseMirror position. An offset landing inside a
 * separator (the newlines between blocks, which exist in the text but not in
 * the document) clamps to the nearest real text position.
 */
export function textOffsetToPm(segments: TextSegment[], offset: number): number {
  if (segments.length === 0) return 0;
  for (const seg of segments) {
    if (offset < seg.textStart) return seg.pmStart;
    if (offset <= seg.textStart + seg.length) return seg.pmStart + (offset - seg.textStart);
  }
  const last = segments[segments.length - 1];
  return last.pmStart + last.length;
}

/** ProseMirror position to plain-text offset, clamping the same way. */
export function pmPositionToTextOffset(segments: TextSegment[], pos: number): number {
  if (segments.length === 0) return 0;
  for (const seg of segments) {
    if (pos < seg.pmStart) return seg.textStart;
    if (pos <= seg.pmStart + seg.length) return seg.textStart + (pos - seg.pmStart);
  }
  const last = segments[segments.length - 1];
  return last.textStart + last.length;
}

export function textRangeToPmRange(
  segments: TextSegment[],
  start: number,
  end: number
): { from: number; to: number } {
  return { from: textOffsetToPm(segments, start), to: textOffsetToPm(segments, end) };
}

export function pmRangeToTextRange(
  segments: TextSegment[],
  from: number,
  to: number
): { start: number; end: number } {
  return {
    start: pmPositionToTextOffset(segments, from),
    end: pmPositionToTextOffset(segments, to),
  };
}
