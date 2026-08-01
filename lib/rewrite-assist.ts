/*
  Rewrite Assist: the "Fix" editor's AI backend. Deliberately separate logic
  from lib/humanize.ts/lib/rewrite.ts/lib/prompts.ts (the paused multi-pass,
  candidate-scored humanizer). This is a single-shot helper: rewrite one
  highlighted span, or the whole draft once if asked, never a pass loop.
*/

import { analyzeText, reasonsForRange, type DetectorResult } from "./detector";
import { createSampledCompletion, getOpenAI, REWRITE_ASSIST_MODEL } from "./openai";

const CONTEXT_RADIUS_CHARS = 1200;

/** Bound on the [start, end) span itself for a single suggestion, not the
 *  surrounding context window above. */
export const REWRITE_ASSIST_SELECTION_MAX_CHARS = 2000;

/** Matches humanize's existing single-shot whole-document cap: this is the
 *  same shape of call (one LLM pass over the full draft), just new logic. */
export const REWRITE_ASSIST_MAX_CHARS = 12_000;

/** Bounded context around [start, end), not the whole document: keeps both
 *  quota cost and real token cost proportional to what's actually being
 *  rewritten instead of the size of the whole draft. */
function windowContext(fullText: string, start: number, end: number): { before: string; after: string } {
  const before = fullText.slice(Math.max(0, start - CONTEXT_RADIUS_CHARS), start);
  const after = fullText.slice(end, Math.min(fullText.length, end + CONTEXT_RADIUS_CHARS));
  return { before, after };
}

function buildSuggestSystem(): string {
  return `You help a person rewrite a specific flagged passage so it reads like they wrote it, not a model. You are a writing assistant, not an automatic pass/fail rewriter: make one solid attempt, do not hedge or add options.

Rules:
- Return only the replacement text for the marked span. No preamble, no quotes around it, no explanation, nothing else.
- Preserve every fact, name, number, and claim in the span. Do not invent anything new.
- Keep the replacement roughly the same length as the original span (within about 40%).
- Match the voice and tone of the surrounding context, do not shift register.
- Never use an em dash or en dash. Use a period, comma, colon, or parentheses instead.
- Avoid stock AI phrasing (delve, seamless, robust, crucial, leverage, utilize, "it's worth noting", "plays a vital role", formal openers like However/Furthermore/Additionally).
- Use contractions where a person naturally would.
- Vary sentence length rather than smoothing everything to the same rhythm.`;
}

function buildSuggestUser(
  before: string,
  spanText: string,
  after: string,
  reasons: string[]
): string {
  const reasonsBlock = reasons.length
    ? reasons.map((r) => `- ${r}`).join("\n")
    : "- No specific pattern flagged, just make it read more human.";

  return `Surrounding context, with the part to rewrite marked between <<< and >>>:

${before}<<<${spanText}>>>${after}

Why this marked part was flagged:
${reasonsBlock}

Return only the replacement text for the marked part.`;
}

/** How many alternative rewrites suggestRewrites returns for the user to
 *  choose from, rather than committing them to a single take. */
const SUGGESTION_COUNT = 3;

/** Rewrites one span, [start, end) into fullText, as a few distinct
 *  candidates rather than one committed answer. Used identically for a
 *  flagged sentence (offsets from analyzeText) and an arbitrary highlighted
 *  selection (native textarea selectionStart/selectionEnd): both are just
 *  character ranges into the same string. */
export async function suggestRewrites({
  fullText,
  start,
  end,
}: {
  fullText: string;
  start: number;
  end: number;
}): Promise<string[]> {
  const spanText = fullText.slice(start, end);
  const { flags } = analyzeText(fullText);
  const reasons = reasonsForRange(flags, start, end);
  const { before, after } = windowContext(fullText, start, end);

  const client = getOpenAI();
  // Sampled hot on purpose, same reasoning as lib/rewrite.ts's n:2 candidates:
  // one API call, n distinct completions, dropped automatically by
  // createSampledCompletion on a model that rejects the parameter.
  const completion = await createSampledCompletion(client, {
    model: REWRITE_ASSIST_MODEL,
    messages: [
      { role: "system", content: buildSuggestSystem() },
      { role: "user", content: buildSuggestUser(before, spanText, after, reasons) },
    ],
    temperature: 0.9,
    n: SUGGESTION_COUNT,
  });

  const suggestions = Array.from(
    new Set(completion.choices.map((c) => c.message?.content?.trim() ?? "").filter(Boolean))
  );
  if (suggestions.length === 0) throw new Error("No suggestion came back. Try again.");
  return suggestions;
}

function buildRewriteAllSystem(): string {
  return `You help a person fix their own draft so it reads like they wrote it, not a model. This is one single attempt, not an iterative pass: do your best in one shot.

Rules:
- Return only the rewritten draft. No preamble, no explanation, no surrounding quotes.
- Preserve every fact, claim, name, number, and quote. Invent nothing, drop nothing.
- Keep every distinct idea from the source somewhere in the rewrite, even if folded into a shorter mention.
- Stay within about 25% of the original word count.
- Keep the same language, and keep bullets as bullets and headings as headings if the source has them.
- Never use an em dash or en dash. Use a period, comma, colon, or parentheses instead.
- Avoid stock AI phrasing (delve, seamless, robust, crucial, leverage, utilize, "it's worth noting", "plays a vital role", formal openers like However/Furthermore/Additionally, the "not just X, it's Y" pivot).
- Vary sentence length aggressively and use contractions naturally. Do not give every paragraph the same shape.`;
}

function buildRewriteAllUser(text: string, result: DetectorResult): string {
  const weakest = [...result.metrics]
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((m) => `${m.label} (${m.score}/100: ${m.detail})`);

  const problems = Array.from(
    new Set(result.flags.map((f) => (f.text ? `"${f.text}" - ${f.reason}` : f.reason)))
  ).slice(0, 20);

  return `Current human score: ${result.score}/100 (higher is more human).

Weakest signals: ${weakest.join("; ")}

Flagged problems to address:
${problems.length ? problems.map((p) => `- ${p}`).join("\n") : "- Nothing specific flagged, focus on structure and rhythm."}

<draft>
${text}
</draft>`;
}

/** Single-shot whole-document rewrite: the explicit "cheat path" escape
 *  hatch. No multi-pass loop, no candidate scoring, no Winston call, that's
 *  reserved for the editor's separate, explicit "Scan again" action. */
export async function rewriteWholeDocument({
  text,
  result,
}: {
  text: string;
  result: DetectorResult;
}): Promise<string> {
  const client = getOpenAI();
  const completion = await createSampledCompletion(client, {
    model: REWRITE_ASSIST_MODEL,
    messages: [
      { role: "system", content: buildRewriteAllSystem() },
      { role: "user", content: buildRewriteAllUser(text, result) },
    ],
    temperature: 0.9,
  });

  const rewritten = completion.choices[0]?.message?.content?.trim();
  if (!rewritten) throw new Error("Rewrite failed. Try again.");
  return rewritten;
}
