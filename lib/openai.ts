import OpenAI from "openai";
import { MissingKeyError } from "./api-errors";

/*
  Model is env-configurable so the humanize engine can be pointed at a cheaper
  model (or an OpenAI-compatible serverless provider) without a code change.
*/
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5.5";

export function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new MissingKeyError("OPENAI_API_KEY");
  }
  return new OpenAI({
    apiKey,
    // Set OPENAI_BASE_URL to use an OpenAI-compatible provider (Together, DeepInfra, Groq).
    baseURL: process.env.OPENAI_BASE_URL,
  });
}
