/*
  Client for the Winston AI APIs: AI-content detection (M4b), plagiarism, and
  fact-checking. All three hit the network and cost real Winston credits (see
  lib/usage.ts's PLAGIARISM_WORD_MULTIPLIER / FACT_CHECK_WORD_MULTIPLIER for
  why those two draw down the monthly quota faster than a detection check).

  AI-detection is called on every rewrite candidate (lib/rewrite.ts's
  best-of-n selection and lib/humanize.ts's per-pass accept/reject), not just
  a before/after report, since that's what it takes to actually select for
  what a real detector rewards instead of our own heuristic proxy. Plagiarism
  and fact-check are standalone, user-triggered checks only (never called
  from the humanize pipeline).

  Same 0-100/higher-is-human scale as our heuristic for AI detection
  (verified against their docs), so scores and verdicts are directly
  comparable and `verdictFor` from lib/detector.ts is reused rather than
  duplicated. Plagiarism's score is the OPPOSITE polarity: higher = more
  plagiarism found, confirmed against Winston's own help docs, so it needs
  its own verdict/color logic wherever it's displayed.

  Never a hard dependency: if the key isn't configured, the text is below
  Winston's minimum length, or the request fails for any reason, callers get
  null back. The humanize pipeline falls back to the heuristic score alone;
  the plagiarism/fact-check UI shows an "unavailable" state.
*/

const WINSTON_API_URL = "https://api.gowinston.ai/v2/ai-content-detection";
const PLAGIARISM_API_URL = "https://api.gowinston.ai/v2/plagiarism";
const FACT_CHECK_API_URL = "https://api.gowinston.ai/v2/fact-checker";

/** Winston rejects requests under this length; shorter text is skipped rather than erroring. */
export const WINSTON_MIN_CHARS = 300;
/** Matches /api/detect's own flat per-request character ceiling. */
export const DETECT_MAX_CHARS = 150_000;

/** Winston's own documented bounds for the plagiarism endpoint's `text` field. */
export const PLAGIARISM_MIN_CHARS = 100;
export const PLAGIARISM_MAX_CHARS = 120_000;

/** Winston's own documented bounds for the fact-checker endpoint's `text` field. */
export const FACT_CHECK_MIN_CHARS = 300;
export const FACT_CHECK_MAX_CHARS = 10_000;

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

export interface PlagiarismSource {
  url: string;
  title: string;
  /** This source's own match score, same 0-100/higher-is-worse scale as the overall result. */
  score: number;
  plagiarismWords: number;
  totalNumberOfWords: number;
  author: string | null;
  publishedDate: number | null;
}

export interface PlagiarismMatch {
  startIndex: number;
  endIndex: number;
}

export interface PlagiarismResult {
  /** 0-100, HIGHER = MORE plagiarism found. Opposite polarity from the AI-detection score. */
  score: number;
  textWordCount: number;
  totalPlagiarismWords: number;
  sources: PlagiarismSource[];
  /** Union of all matched spans across every source, as offsets into the original text. */
  matches: PlagiarismMatch[];
}

interface PlagiarismApiResponse {
  result: {
    score: number;
    textWordCounts: number;
    totalPlagiarismWords: number;
  };
  sources?: {
    url: string;
    title: string;
    score: number;
    plagiarismWords: number;
    totalNumberOfWords: number;
    author: string | null;
    publishedDate: number | null;
  }[];
  indexes?: { startIndex: number; endIndex: number }[];
}

export async function scoreWithPlagiarism(text: string): Promise<PlagiarismResult | null> {
  const apiKey = process.env.WINSTON_API_KEY;
  if (!apiKey || text.length < PLAGIARISM_MIN_CHARS) return null;

  try {
    const res = await fetch(PLAGIARISM_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      console.error(`Winston plagiarism request failed (${res.status}): ${await res.text()}`);
      return null;
    }

    const data = (await res.json()) as PlagiarismApiResponse;
    return {
      score: data.result.score,
      textWordCount: data.result.textWordCounts,
      totalPlagiarismWords: data.result.totalPlagiarismWords,
      sources: (data.sources ?? []).map((s) => ({
        url: s.url,
        title: s.title,
        score: s.score,
        plagiarismWords: s.plagiarismWords,
        totalNumberOfWords: s.totalNumberOfWords,
        author: s.author,
        publishedDate: s.publishedDate,
      })),
      matches: (data.indexes ?? []).map((i) => ({ startIndex: i.startIndex, endIndex: i.endIndex })),
    };
  } catch (err) {
    console.error("Winston plagiarism request errored:", err);
    return null;
  }
}

export type FactCheckVerdict = "SUPPORTED" | "PARTIALLY_SUPPORTED" | "NOT_ENOUGH_EVIDENCE" | "REFUTED";

export interface FactCheckLink {
  url: string;
  title: string;
}

export interface FactCheckClaim {
  sentence: string;
  claim: string;
  verdict: FactCheckVerdict;
  /** 0-100, higher = better-supported, same polarity as the AI-detection score. */
  score: number;
  explanation: string;
  links: FactCheckLink[];
}

export interface FactCheckResult {
  score: number;
  claims: FactCheckClaim[];
}

interface FactCheckApiResponse {
  score: number;
  claims?: {
    sentence: string;
    claim: string;
    verdict: FactCheckVerdict;
    score: number;
    explanation: string;
    links?: { url: string; title: string }[];
  }[];
}

export async function checkFacts(text: string): Promise<FactCheckResult | null> {
  const apiKey = process.env.WINSTON_API_KEY;
  if (!apiKey || text.length < FACT_CHECK_MIN_CHARS) return null;

  try {
    const res = await fetch(FACT_CHECK_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      console.error(`Winston fact-checker request failed (${res.status}): ${await res.text()}`);
      return null;
    }

    const data = (await res.json()) as FactCheckApiResponse;
    return {
      score: data.score,
      claims: (data.claims ?? []).map((c) => ({
        sentence: c.sentence,
        claim: c.claim,
        verdict: c.verdict,
        score: c.score,
        explanation: c.explanation,
        links: c.links ?? [],
      })),
    };
  } catch (err) {
    console.error("Winston fact-checker request errored:", err);
    return null;
  }
}
