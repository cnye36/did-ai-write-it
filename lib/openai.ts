import OpenAI from "openai";
import { MissingKeyError } from "./api-errors";

/*
  Model is env-configurable so rewrite-assist (lib/rewrite-assist.ts) can be
  pointed at a cheaper model (or an OpenAI-compatible serverless provider)
  without a code change.
*/
export const REWRITE_ASSIST_MODEL = process.env.REWRITE_ASSIST_MODEL ?? "gpt-5.6-terra";
export const DETECTION_INSIGHT_MODEL =
  process.env.DETECTION_INSIGHT_MODEL ?? REWRITE_ASSIST_MODEL;

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

/*
  Create a completion with sampling knobs (temperature, penalties, n) that not
  every model accepts: OpenAI's reasoning models reject them outright, while
  open models behind OPENAI_BASE_URL support them all. Whichever parameter the
  provider rejects gets dropped and the request retried, so the same call works
  everywhere and uses as much sampling heat as the model allows.
*/
export async function createSampledCompletion(
  client: OpenAI,
  params: OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming,
  options?: { timeout?: number }
): Promise<OpenAI.Chat.Completions.ChatCompletion> {
  const p = { ...params };
  for (;;) {
    try {
      return await client.chat.completions.create(p, options);
    } catch (err) {
      if (
        err instanceof OpenAI.APIError &&
        typeof err.param === "string" &&
        (err.code === "unsupported_value" ||
          err.code === "unsupported_parameter" ||
          err.code === "unknown_parameter") &&
        err.param in p
      ) {
        delete (p as unknown as Record<string, unknown>)[err.param];
        continue;
      }
      throw err;
    }
  }
}
