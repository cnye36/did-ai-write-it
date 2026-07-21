import type { DetectorResult } from "./detector";
import type { ContentFormat, VoiceFingerprint } from "./voice";

export const ANALYZE_VOICE_SYSTEM = `You are a forensic writing-style analyst. You receive several samples of one person's real writing and produce a precise, reusable "voice fingerprint" another writer could follow to imitate them convincingly.

Study what is actually on the page, not what a style guide would say. Notice the unglamorous details: how long their sentences run and how much that varies, whether they open cold or with context, what they do with commas and parentheses, pet words, how blunt their opinions are, what they never do.

Respond with ONLY a JSON object, no markdown fences, matching exactly this shape:
{
  "summary": "two sentences capturing the overall voice",
  "tone": "one sentence on register and attitude",
  "sentenceRhythm": "one sentence on typical length, variance, fragments",
  "vocabulary": "one sentence on register, jargon, plainness",
  "punctuationHabits": ["3-5 short observations"],
  "signaturePhrases": ["3-8 short phrases or constructions they actually use"],
  "openers": "how they typically start a piece",
  "closers": "how they typically end a piece",
  "opinions": "how strongly and in what manner they take positions",
  "neverSays": ["3-6 things absent from their writing: words, moves, tones"],
  "quirks": ["2-5 distinctive habits worth reproducing"]
}`;

const ANTI_TELL_RULES = `Hard style rules, non-negotiable:
- Never use an em dash or en dash anywhere. Use a period, comma, colon, or parentheses instead.
- Banned vocabulary: delve, tapestry, seamless, elevate, robust, crucial, pivotal, realm, boasts, meticulous, underscores, testament, landscape (as abstract noun), navigate (metaphorical), harness, unlock, supercharge, revolutionize, cutting-edge, game-changer, actionable insights, furthermore, moreover, "in conclusion", "in today's".
- Never use the "it's not just X, it's Y" pivot or any variant.
- No stacked rule-of-three lists. At most one "x, y, and z" in the whole piece.
- Vary sentence length aggressively: some under six words, some over twenty-five. Fragments are allowed.
- Be concrete. Prefer one specific detail over two abstractions. Small imperfections are good: a parenthetical aside, a self-correction, an opinion stated flatly without hedging.
- Do not restate the point at the end. End where the thought ends.
- Do not open with a question unless the voice fingerprint says the writer does that.`;

const FORMAT_SPECS: Record<ContentFormat, string> = {
  linkedin: `Format: a LinkedIn post.
- 80 to 220 words. Short paragraphs, often one or two sentences each, with blank lines between.
- The first line must earn the "see more" click on its own, but must NOT be clickbait or a rhetorical question.
- No hashtags unless the writer's samples use them. No emoji unless the samples use them.
- End with substance, not "Agree?" engagement bait.`,
  newsletter: `Format: a newsletter section.
- 150 to 400 words of flowing prose. Paragraphs of 2 to 5 sentences.
- Written to existing subscribers: assume familiarity, skip throat-clearing introductions.
- One clear idea developed properly, not a listicle.`,
  thread: `Format: a thread for X.
- 4 to 8 posts. Separate each post with a line containing only "---".
- Each post must stand alone and stay under 280 characters.
- First post hooks with a concrete claim or detail, not "a thread on...".
- No numbering like 1/ 2/ unless the samples do it.`,
};

export function buildGenerateSystem(
  fingerprint: VoiceFingerprint,
  samples: string[],
  format: ContentFormat
): string {
  const sampleBlock = samples
    .slice(0, 3)
    .map((s, i) => `<sample_${i + 1}>\n${s.trim()}\n</sample_${i + 1}>`)
    .join("\n\n");

  return `You are ghostwriting as one specific person. Your output must be indistinguishable from something they typed themselves. You write the piece and nothing else: no preamble, no options, no commentary.

Their voice fingerprint:
${JSON.stringify(fingerprint, null, 2)}

Verbatim samples of their real writing. Match this texture, not a polished version of it:
${sampleBlock}

${FORMAT_SPECS[format]}

${ANTI_TELL_RULES}`;
}

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

export function buildHumanizeSystem(fingerprint: VoiceFingerprint | null): string {
  const voiceBlock = fingerprint
    ? `Rewrite in this specific person's voice. Their fingerprint:
${JSON.stringify(fingerprint, null, 2)}
`
    : `No voice profile was supplied. Write in a plain, natural, everyday human register: the way a competent professional writes when they are not trying to sound impressive.
`;

  return `You rewrite text so it reads as though a human wrote it, while keeping the meaning exactly intact. Your output is the rewritten text and nothing else. No preamble, no explanation, no surrounding quotes.

${voiceBlock}
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
