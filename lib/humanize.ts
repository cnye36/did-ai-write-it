import { analyzeText, countWords, type DetectorResult } from "./detector";

/*
  Multi-pass humanize pipeline.

  Each pass rewrites the text, re-scores it, and keeps the result only if it
  actually improved. The loop stops early once the target score is reached,
  so a clean draft costs one model call and a bad one costs at most
  `maxPasses`. Provider-agnostic: the caller supplies `rewrite`.

  Detector-agnostic too: our own heuristic (lib/detector.ts) always scores
  every candidate, since it's free and it's what feeds the per-pass prompt
  feedback (flags, weakest metrics). But when the caller supplies
  `scoreExternally` (a real third-party detector, e.g. Winston), that score
  becomes the authority for accept/reject and for the stop condition,
  because a good heuristic score does not reliably predict a good real one.
  `scoreExternally` returning null for a given text (not configured, request
  failed) falls back to the heuristic score for that comparison, so this is
  never a hard dependency.
*/

/*
  85 is deliberately just above the detector's "human" verdict threshold (75):
  solidly human, and actually reachable. Impersonal third-person copy caps out
  around 84-86 under the skeptical scoring (no first person, no concrete
  numbers), so a higher target would burn the whole pass budget on every run.
  Note this bar gets meaningfully harder when scoreExternally is wired in:
  a real detector does not track our heuristic closely, so hitting 85 there
  can take more passes, or may not happen at all for some genres of text.
*/
export const DEFAULT_TARGET_SCORE = 85;
export const DEFAULT_MAX_PASSES = 4;

/** Guards against a rewrite that drops or invents content instead of rephrasing. */
const MIN_LENGTH_RATIO = 0.5;
const MAX_LENGTH_RATIO = 2;

export interface RewriteContext {
  /** Best text so far (the original on pass 1). */
  text: string;
  /** Detector result for that text, so the prompt can target real problems. */
  result: DetectorResult;
  pass: number;
}

/** Scores a candidate against a real third-party detector. Null means unavailable
 *  for this text (not configured, request failed): the pipeline falls back to
 *  the heuristic score for that comparison. */
export type ExternalScorer = (text: string) => Promise<number | null>;

export interface HumanizePass {
  pass: number;
  score: number;
  /** Real-detector score for this pass's candidate, when scoreExternally was supplied. */
  externalScore?: number | null;
  accepted: boolean;
  rejectedBecause?: "empty response" | "length drifted" | "no improvement";
}

export interface HumanizeOutcome {
  text: string;
  before: DetectorResult;
  after: DetectorResult;
  externalBefore?: number | null;
  externalAfter?: number | null;
  passes: HumanizePass[];
}

export async function runHumanizePipeline(
  original: string,
  rewrite: (ctx: RewriteContext) => Promise<string>,
  opts: { targetScore?: number; maxPasses?: number; scoreExternally?: ExternalScorer } = {}
): Promise<HumanizeOutcome> {
  const targetScore = opts.targetScore ?? DEFAULT_TARGET_SCORE;
  const maxPasses = opts.maxPasses ?? DEFAULT_MAX_PASSES;
  const scoreExternally = opts.scoreExternally;

  /** The metric actually driving accept/reject/stop: external when available, heuristic otherwise. */
  const metricFor = (heuristicScore: number, external: number | null) => external ?? heuristicScore;

  const before = analyzeText(original);
  const externalBefore = scoreExternally ? await scoreExternally(original) : null;

  let bestText = original;
  let bestResult = before;
  let bestExternal = externalBefore;
  const passes: HumanizePass[] = [];

  for (
    let pass = 1;
    pass <= maxPasses && metricFor(bestResult.score, bestExternal) < targetScore;
    pass++
  ) {
    const candidate = (await rewrite({ text: bestText, result: bestResult, pass })).trim();

    if (!candidate) {
      passes.push({
        pass,
        score: bestResult.score,
        externalScore: bestExternal,
        accepted: false,
        rejectedBecause: "empty response",
      });
      continue;
    }

    const candidateResult = analyzeText(candidate);

    if (!lengthPreserved(candidate, original)) {
      passes.push({
        pass,
        score: candidateResult.score,
        externalScore: null,
        accepted: false,
        rejectedBecause: "length drifted",
      });
      continue;
    }

    const candidateExternal = scoreExternally ? await scoreExternally(candidate) : null;
    const accepted =
      metricFor(candidateResult.score, candidateExternal) > metricFor(bestResult.score, bestExternal);

    passes.push({
      pass,
      score: candidateResult.score,
      externalScore: candidateExternal,
      accepted,
      rejectedBecause: accepted ? undefined : "no improvement",
    });

    if (accepted) {
      bestText = candidate;
      bestResult = candidateResult;
      bestExternal = candidateExternal;
    }
  }

  return {
    text: bestText,
    before,
    after: bestResult,
    externalBefore,
    externalAfter: bestExternal,
    passes,
  };
}

function lengthPreserved(candidate: string, original: string): boolean {
  const originalWords = countWords(original);
  if (originalWords === 0) return false;
  const ratio = countWords(candidate) / originalWords;
  return ratio >= MIN_LENGTH_RATIO && ratio <= MAX_LENGTH_RATIO;
}
