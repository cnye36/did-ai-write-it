import { verdictFor, type Verdict } from "@/lib/detector";
import { locateWinstonSentences, type WinstonSentenceScore } from "@/lib/winston-sentences";

export interface SentenceReportRow {
  text: string;
  score: number;
  verdict: Verdict;
}

/** Shared source of truth for the detect page's per-sentence report: the full
 *  list under the highlighted text and the sidebar's worst-sentences preview
 *  both build from this, so the two never drift out of sync with each other.
 *  Empty until a verified Winston result exists: the heuristic's own verdicts
 *  are known to disagree with Winston too often to present as a report. */
export function buildSentenceReport(
  text: string,
  verified: { score: number; sentences: WinstonSentenceScore[] } | null
): SentenceReportRow[] {
  if (!verified) return [];
  return locateWinstonSentences(text, verified.sentences).map((s) => ({
    text: s.text,
    score: s.score,
    verdict: verdictFor(s.score),
  }));
}
