import type { DetectorResult } from "./detector";

const ANTI_TELL_RULES = `Hard style rules, non-negotiable:
- Never use an em dash or en dash anywhere. Use a period, comma, colon, or parentheses instead.
- Banned vocabulary: delve, tapestry, seamless, elevate, robust, crucial, pivotal, realm, boasts, meticulous, underscores, testament, landscape (as abstract noun), navigate (metaphorical), harness, unlock, supercharge, revolutionize, cutting-edge, game-changer, actionable insights, furthermore, moreover, "in conclusion", "in today's".
- Never use the "it's not just X, it's Y" pivot or any variant.
- No stacked rule-of-three lists. At most one "x, y, and z" in the whole piece.
- Vary sentence length aggressively: some under six words, some over twenty-five. Fragments are allowed.
- Be concrete. Prefer one specific detail over two abstractions. Small imperfections are good: a parenthetical aside, a self-correction, an opinion stated flatly without hedging.
- Do not restate the point at the end. End where the thought ends.
- Do not open with a question.`;

const PRESERVATION_RULES = `What must survive the rewrite, without exception:
- Every fact, claim, name, number, and quote. Invent nothing, drop nothing.
- The overall meaning and the order the ideas arrive in.
- Approximate length. Stay within about 20% of the original word count.
- Formatting: paragraph breaks, line breaks, bullets, and headings stay where they are.
- The language the text is written in.`;

const RHYTHM_RULES = `How to fix machine rhythm, which is what detectors weigh most:
- Vary sentence length hard. In any paragraph of three or more sentences, include at least one under six words and at least one over twenty.
- Never leave three sentences in a row within a couple of words of the same length.
- Fragments are allowed. Starting a sentence with And or But is allowed. Contractions are preferred.
- Prefer plain, specific words over impressive ones. Cut adverbs that carry no information.`;

export function buildHumanizeSystem(): string {
  return `You rewrite text so it reads as though a human wrote it, while keeping the meaning exactly intact. Your output is the rewritten text and nothing else. No preamble, no explanation, no surrounding quotes.

Write in a plain, natural, everyday human register: the way a competent professional writes when they are not trying to sound impressive.

You will receive the current draft, its automated "human score" out of 100, and the specific problems a detector flagged. Eliminate every flagged problem. Beyond those, change only what you must to fix rhythm.

${PRESERVATION_RULES}

${RHYTHM_RULES}

${ANTI_TELL_RULES}`;
}

/** Per-pass user message: feeds the detector's actual findings back into the rewrite. */
export function buildHumanizeUser(
  text: string,
  result: DetectorResult,
  pass: number
): string {
  const problems = Array.from(
    new Set(
      result.flags.map((f) => (f.text ? `"${f.text}" - ${f.reason}` : f.reason))
    )
  ).slice(0, 30);

  const weakest = [...result.metrics]
    .sort((a, b) => a.score - b.score)
    .slice(0, 2)
    .map((m) => `${m.label} (${m.score}/100: ${m.detail})`);

  const retryNote =
    pass > 1
      ? `\nThis is attempt ${pass}. The previous rewrite did not clear the bar, so change the sentence rhythm more aggressively this time: split long sentences, merge short ones, and reorder clauses.\n`
      : "";

  return `Current human score: ${result.score}/100 (higher is more human).

Weakest signals: ${weakest.join("; ")}

Flagged problems to eliminate:
${problems.length ? problems.map((p) => `- ${p}`).join("\n") : "- No specific phrases flagged. Focus entirely on sentence rhythm and length variation."}
${retryNote}
<draft>
${text}
</draft>`;
}
