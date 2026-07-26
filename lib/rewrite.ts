/*
  Provider dispatch for the humanize rewrite call. Picks OpenAI or Anthropic
  based on HUMANIZE_PROVIDER (defaults to "openai", so unset behaves exactly
  as before), generates a couple of sampled candidates, and picks the winner.
  This is the one place both the API route and the eval harness call, so they
  can't drift out of sync with each other.

  The two providers are genuinely different APIs, not just a base URL swap
  (unlike OPENAI_BASE_URL): different sampling knobs, different multi-candidate
  mechanism (OpenAI's n vs firing parallel requests), different system-prompt
  placement. Each provider's quirks stay local to its own branch here.
*/

import { analyzeText } from "./detector";
import { createSampledCompletion, getOpenAI, OPENAI_MODEL } from "./openai";
import { ANTHROPIC_MAX_TOKENS, ANTHROPIC_MODEL, getAnthropic } from "./anthropic";
import { scoreWithWinston } from "./winston";

export type Provider = "openai" | "anthropic";

export function getProvider(): Provider {
  return process.env.HUMANIZE_PROVIDER === "anthropic" ? "anthropic" : "openai";
}

/** The model actually in use, for display/logging (not for calling the SDK). */
export function getModelLabel(): string {
  return getProvider() === "anthropic" ? ANTHROPIC_MODEL : OPENAI_MODEL;
}

async function openaiCandidates(system: string, user: string): Promise<string[]> {
  const client = getOpenAI();
  // Sampled hot on purpose: detectors score token predictability, so rarer
  // word choices are the point. n=2 buys a second candidate for only the
  // extra output tokens. Knobs the model rejects are dropped automatically
  // (OpenAI reasoning models take none of them).
  const completion = await createSampledCompletion(client, {
    model: OPENAI_MODEL,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 1.2,
    frequency_penalty: 0.4,
    presence_penalty: 0.2,
    n: 2,
  });
  return completion.choices.map((c) => c.message?.content?.trim() ?? "").filter(Boolean);
}

async function anthropicCandidates(system: string, user: string): Promise<string[]> {
  const client = getAnthropic();
  // Anthropic has no n parameter and no frequency/presence penalty: fire two
  // parallel requests instead, and lean on temperature alone for sampling heat
  // (1.0 is the top of its valid range, unlike OpenAI's 0-2 scale).
  const requests = [1, 2].map(() =>
    client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: ANTHROPIC_MAX_TOKENS,
      system,
      temperature: 1,
      messages: [{ role: "user", content: user }],
    })
  );
  const responses = await Promise.all(requests);
  return responses
    .map((res) =>
      res.content
        .map((block) => (block.type === "text" ? block.text : ""))
        .join("")
        .trim()
    )
    .filter(Boolean);
}

/*
  Picks the winning candidate from a single pass. Prefers a real Winston score
  when every candidate gets one back (not just some: a partial Winston outage
  shouldn't silently mix scales), since a good heuristic score does not
  reliably predict a good real one, exactly what this exists to correct for.
  Falls back to our own heuristic when Winston is unconfigured or unavailable.
*/
export async function pickBest(candidates: string[]): Promise<string> {
  if (candidates.length === 0) return "";
  if (candidates.length === 1) return candidates[0];

  const winstonScores = await Promise.all(candidates.map((c) => scoreWithWinston(c)));
  const useWinston = winstonScores.every((w) => w !== null);

  let bestIndex = 0;
  let bestScore = useWinston ? winstonScores[0]!.score : analyzeText(candidates[0]).score;
  for (let i = 1; i < candidates.length; i++) {
    const score = useWinston ? winstonScores[i]!.score : analyzeText(candidates[i]).score;
    if (score > bestScore) {
      bestScore = score;
      bestIndex = i;
    }
  }
  return candidates[bestIndex];
}

/** Generates candidates from the configured provider and keeps the best-scoring one. */
export async function generateBestRewrite(system: string, user: string): Promise<string> {
  const candidates =
    getProvider() === "anthropic"
      ? await anthropicCandidates(system, user)
      : await openaiCandidates(system, user);

  return pickBest(candidates);
}
