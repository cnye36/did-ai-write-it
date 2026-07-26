/*
  Client for the Winston AI real-detector API (M4b). Unlike lib/detector.ts,
  this hits the network and costs credits: it is called on every rewrite
  candidate (lib/rewrite.ts's best-of-n selection and lib/humanize.ts's
  per-pass accept/reject), not just a before/after report, since that's what
  it takes to actually select for what a real detector rewards instead of
  our own heuristic proxy.

  Same 0-100/higher-is-human scale as our heuristic (verified against their
  docs), so scores and verdicts are directly comparable and `verdictFor` from
  lib/detector.ts is reused rather than duplicated.

  Never a hard dependency: if the key isn't configured, the text is below
  Winston's minimum length, or the request fails for any reason, callers get
  null back and the humanize pipeline falls back to the heuristic score alone.
*/

const WINSTON_API_URL = "https://api.gowinston.ai/v2/ai-content-detection";

/** Winston rejects requests under this length; shorter text is skipped rather than erroring. */
export const WINSTON_MIN_CHARS = 300;

export interface WinstonSentenceScore {
  text: string;
  score: number;
}

export interface WinstonResult {
  score: number;
  sentences: WinstonSentenceScore[];
  readabilityScore: number | null;
}

interface WinstonApiResponse {
  score: number;
  sentences?: { text: string; score: number }[];
  readability_score?: number;
}

export function isWinstonConfigured(): boolean {
  return Boolean(process.env.WINSTON_API_KEY);
}

export async function scoreWithWinston(text: string): Promise<WinstonResult | null> {
  const apiKey = process.env.WINSTON_API_KEY;
  if (!apiKey || text.length < WINSTON_MIN_CHARS) return null;

  try {
    const res = await fetch(WINSTON_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text, sentences: true }),
    });

    if (!res.ok) {
      console.error(`Winston AI request failed (${res.status}): ${await res.text()}`);
      return null;
    }

    const data = (await res.json()) as WinstonApiResponse;
    return {
      score: data.score,
      sentences: data.sentences ?? [],
      readabilityScore: data.readability_score ?? null,
    };
  } catch (err) {
    console.error("Winston AI request errored:", err);
    return null;
  }
}

/** Adapter matching lib/humanize.ts's ExternalScorer shape: (text) => Promise<number | null>. */
export async function winstonScoreOnly(text: string): Promise<number | null> {
  const result = await scoreWithWinston(text);
  return result ? result.score : null;
}
