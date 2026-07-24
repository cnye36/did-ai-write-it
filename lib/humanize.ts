import { analyzeText, type DetectorResult } from "./detector";

/*
  Multi-pass humanize pipeline.

  Each pass rewrites the text, re-scores it with the detector, and keeps the
  result only if it actually improved. The loop stops early once the target
  score is reached, so a clean draft costs one model call and a bad one costs
  at most `maxPasses`. Provider-agnostic: the caller supplies `rewrite`.
*/

/*
  85 is deliberately just above the detector's "human" verdict threshold (75):
  solidly human, and actually reachable. Impersonal third-person copy caps out
  around 84-86 under the skeptical scoring (no first person, no concrete
  numbers), so a higher target would burn the whole pass budget on every run.
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

export interface HumanizePass {
  pass: number;
  score: number;
  accepted: boolean;
  rejectedBecause?: "empty response" | "length drifted" | "no improvement";
}

export interface HumanizeOutcome {
  text: string;
  before: DetectorResult;
  after: DetectorResult;
  passes: HumanizePass[];
}

export async function runHumanizePipeline(
  original: string,
  rewrite: (ctx: RewriteContext) => Promise<string>,
  opts: { targetScore?: number; maxPasses?: number } = {}
): Promise<HumanizeOutcome> {
  const targetScore = opts.targetScore ?? DEFAULT_TARGET_SCORE;
  const maxPasses = opts.maxPasses ?? DEFAULT_MAX_PASSES;

  const before = analyzeText(original);
  let bestText = original;
  let bestResult = before;
  const passes: HumanizePass[] = [];

  for (let pass = 1; pass <= maxPasses && bestResult.score < targetScore; pass++) {
    const candidate = (await rewrite({ text: bestText, result: bestResult, pass })).trim();

    if (!candidate) {
      passes.push({
        pass,
        score: bestResult.score,
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
        accepted: false,
        rejectedBecause: "length drifted",
      });
      continue;
    }

    const accepted = candidateResult.score > bestResult.score;
    passes.push({
      pass,
      score: candidateResult.score,
      accepted,
      rejectedBecause: accepted ? undefined : "no improvement",
    });

    if (accepted) {
      bestText = candidate;
      bestResult = candidateResult;
    }
  }

  return { text: bestText, before, after: bestResult, passes };
}

function lengthPreserved(candidate: string, original: string): boolean {
  const originalWords = countWords(original);
  if (originalWords === 0) return false;
  const ratio = countWords(candidate) / originalWords;
  return ratio >= MIN_LENGTH_RATIO && ratio <= MAX_LENGTH_RATIO;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
