import Anthropic from "@anthropic-ai/sdk";
import { MissingKeyError } from "./api-errors";

export const MODEL = "claude-sonnet-5";

export function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new MissingKeyError("ANTHROPIC_API_KEY");
  }
  return new Anthropic({ apiKey });
}
