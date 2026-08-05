import { reasonsForRange, verdictFor, type DetectorResult, type Verdict } from "@/lib/detector";
import { locateWinstonSentences, type WinstonSentenceScore } from "@/lib/winston-sentences";

export interface SentenceReportRow {
  text: string;
  score: number;
  verdict: Verdict;
  reasons: string[];
}

/** Shared source of truth for the detect page's per-sentence report: the full
 *  list under the highlighted text and the sidebar's worst-sentences preview
 *  both build from this, so the two never drift out of sync with each other. */
export function buildSentenceReport(
  text: string,
  live: DetectorResult,
  verified: { score: number; sentences: WinstonSentenceScore[] } | null
): SentenceReportRow[] {
  if (verified) {
    return locateWinstonSentences(text, verified.sentences).map((s) => ({
      text: s.text,
      score: s.score,
      verdict: verdictFor(s.score),
      reasons: reasonsForRange(live.flags, s.start, s.end),
    }));
  }
  return live.sentences.map((s) => ({ text: s.text, score: s.score, verdict: s.verdict, reasons: s.reasons }));
}
