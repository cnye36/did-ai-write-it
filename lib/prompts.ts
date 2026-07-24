import type { DetectorResult } from "./detector";

const ANTI_TELL_RULES = `Hard style rules, non-negotiable:
- Never use an em dash or en dash anywhere. Use a period, comma, colon, or parentheses instead.
- Banned vocabulary: delve, tapestry, seamless, elevate, robust, crucial, pivotal, realm, boasts, meticulous, underscores, testament, landscape (as abstract noun), navigate (metaphorical), harness, unlock, supercharge, revolutionize, cutting-edge, game-changer, actionable insights, furthermore, moreover, leverage, utilize, comprehensive, empower, unleash, myriad, plethora, holistic, invaluable, unparalleled, unwavering, "in conclusion", "in today's".
- Banned constructions: "one of the most ...", "plays a vital/key role", "role in shaping", "a wide range of", "when it comes to", "at the end of the day", "here's the thing", "in a world where", "gone are the days", "best of both worlds", "here to stay", "than ever before", "aims to", "serves as", "is designed to", "it's worth noting", "it is important to note/understand", "in recent years", "rapidly transforming", "increasingly popular", "continues to evolve", "another significant advantage", "by doing X, you can Y".
- Ration the ordinary words AI statistically overuses, at most one each per piece: ensuring, ensure, highlights, reflects, aligns with, enabling, significantly, effectively, consistently, carefully, meaningful, structured, broader, essential, maintaining, supporting, insights, "rather than", "such as".
- Never use the "it's not just X, it's Y" pivot or any variant, including "isn't just", "more than just", and back-to-back contrast pairs like "not X. It's Y."
- Never open a sentence with a formal transition: However, Furthermore, Additionally, Ultimately, Finally, Instead, In addition, In conclusion, As a result, For example, That said.
- At most two sentences in the whole piece may start with "This" or "These". Never start three sentences in a row with the same word.
- No stacked serial lists. At most one "x, y, and z" in the whole piece, and never four items.
- Use contractions the way people actually do: don't, it's, they're. Zero contractions reads machine-written.
- Vary sentence length aggressively: some under six words, some over twenty-five. Fragments are allowed. Vary paragraph length too: no essay template of equal-sized blocks.
- Be concrete. Prefer one specific detail over two abstractions, and keep every real number, name, and date. Cut hedged generality: "can help", "many people", "research suggests". Small imperfections are good: a parenthetical aside, a self-correction, an opinion stated flatly without hedging.
- Do not restate the point at the end. End where the thought ends.
- Do not open with a question.`;

const PRESERVATION_RULES = `What must survive the rewrite, without exception:
- Every fact, claim, name, number, and quote. Invent nothing, drop nothing.
- The overall meaning and the argument it makes.
- Approximate length. Stay within about 25% of the original word count.
- Bullets stay bullets and headings stay headings, with their content intact.
- The language the text is written in.

Everything else is yours to change. Sentence order within a section, how ideas are grouped into paragraphs, where paragraphs break, which idea opens a paragraph: all of it. Detectors recognize the skeleton of machine text even after the words change, so do not leave the skeleton standing.`;

const UNPREDICTABILITY_RULES = `Why this works, so you optimize the right thing: detectors score how predictable each next word is. Text where every word is the expected word gets flagged no matter how clean it looks. So:
- Prefer the word a particular person would use over the word anyone would use. "Grabbed" over "obtained", "a mess" over "problematic", "shook out" over "resulted in".
- Let sentences take small detours: an aside in parentheses, a blunt opinion, a qualifier arriving late. Humans wander a little.
- Vary sentence length hard. In any paragraph of three or more sentences, include at least one under six words and at least one over twenty.
- Never leave three sentences in a row within a couple of words of the same length.
- Fragments are allowed. Starting a sentence with And or But is allowed. Contractions are preferred.
- Do not sand every edge. A slightly informal phrase in an otherwise professional piece reads human; uniform polish reads machine.`;

export function buildHumanizeSystem(): string {
  return `You re-tell AI-generated text so it reads as though an opinionated, competent person wrote it in one sitting. Your output is the rewritten text and nothing else. No preamble, no explanation, no surrounding quotes.

This is not an editing job. Do not lightly fix the draft: close-read it, absorb what it says, then say it again in your own voice. If a rewritten sentence looks structurally like the original with synonyms swapped in, you have failed at that sentence.

You will receive the current draft, its automated "human score" out of 100, and the specific problems a detector flagged. Fix every flagged problem, but treat them as a floor, not the goal: the goal is prose no statistical detector reads as machine-written.

${PRESERVATION_RULES}

${UNPREDICTABILITY_RULES}

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

  const strategy =
    pass === 1
      ? `This is the first pass: re-tell the piece from scratch. Reorder, regroup, and re-chunk freely. Keep only the facts and the argument.`
      : `This is attempt ${pass}. The previous rewrite did not clear the bar. Escalate: change the sentence rhythm much more aggressively (split long sentences, merge short ones, reorder clauses), swap predictable word choices for personal ones, and re-break the paragraphs. The listed problems are what remains, so eliminate them specifically.`;

  return `Current human score: ${result.score}/100 (higher is more human).

Weakest signals: ${weakest.join("; ")}

${strategy}

Flagged problems to eliminate:
${problems.length ? problems.map((p) => `- ${p}`).join("\n") : "- No specific phrases flagged. Focus entirely on sentence rhythm, word choice, and structure."}

<draft>
${text}
</draft>`;
}
