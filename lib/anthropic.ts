import Anthropic from "@anthropic-ai/sdk";
import { MissingKeyError } from "./api-errors";

export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-5";

/*
  Output token ceiling for the humanize rewrite. Sized against the input cap
  (MAX_CHARS = 12000 chars in app/api/humanize/route.ts, roughly 2200 words)
  times the pipeline's 2x length-drift guard (lib/humanize.ts), with headroom.
*/
export const ANTHROPIC_MAX_TOKENS = 8192;

export function getAnthropic(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new MissingKeyError("ANTHROPIC_API_KEY");
  }
  return new Anthropic({ apiKey });
}
