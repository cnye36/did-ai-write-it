import { diffArrays, diffWordsWithSpace } from "diff";
import { splitSentences } from "./detector";

export type DiffEntryKind = "unchanged" | "added" | "removed" | "changed";

export interface WordDiffPart {
  value: string;
  added: boolean;
  removed: boolean;
}

export interface DiffEntry {
  kind: DiffEntryKind;
  before: string | null;
  after: string | null;
  /** Word-level diff of before -> after, set only for "changed" entries. */
  wordDiff: WordDiffPart[] | null;
}

export interface DiffSummary {
  wordsBefore: number;
  wordsAfter: number;
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
}

export interface TextDiff {
  entries: DiffEntry[];
  summary: DiffSummary;
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

/** Sentence-level diff (via splitSentences, same boundaries lib/detector.ts uses
 *  everywhere else) with adjacent removed/added blocks paired 1:1 as "changed"
 *  (a rewritten sentence) and word-diffed for inline highlighting. */
export function diffText(before: string, after: string): TextDiff {
  const beforeSentences = splitSentences(before).map((s) => s.text);
  const afterSentences = splitSentences(after).map((s) => s.text);
  const parts = diffArrays(beforeSentences, afterSentences);

  const entries: DiffEntry[] = [];
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];

    if (!part.added && !part.removed) {
      for (const s of part.value) entries.push({ kind: "unchanged", before: s, after: s, wordDiff: null });
      continue;
    }

    if (part.removed) {
      const next = parts[i + 1];
      if (next?.added) {
        const removedArr = part.value;
        const addedArr = next.value;
        const pairCount = Math.min(removedArr.length, addedArr.length);
        for (let j = 0; j < pairCount; j++) {
          entries.push({
            kind: "changed",
            before: removedArr[j],
            after: addedArr[j],
            wordDiff: diffWordsWithSpace(removedArr[j], addedArr[j]),
          });
        }
        for (let j = pairCount; j < removedArr.length; j++) {
          entries.push({ kind: "removed", before: removedArr[j], after: null, wordDiff: null });
        }
        for (let j = pairCount; j < addedArr.length; j++) {
          entries.push({ kind: "added", before: null, after: addedArr[j], wordDiff: null });
        }
        i++; // consumed the paired "added" part above
        continue;
      }
      for (const s of part.value) entries.push({ kind: "removed", before: s, after: null, wordDiff: null });
      continue;
    }

    for (const s of part.value) entries.push({ kind: "added", before: null, after: s, wordDiff: null });
  }

  const summary = entries.reduce(
    (acc, e) => {
      acc[e.kind]++;
      return acc;
    },
    { added: 0, removed: 0, changed: 0, unchanged: 0 } as Record<DiffEntryKind, number>
  );

  return {
    entries,
    summary: { ...summary, wordsBefore: wordCount(before), wordsAfter: wordCount(after) },
  };
}
