import { NextRequest } from "next/server";
import { errorResponse, QuotaExceededError } from "@/lib/api-errors";
import { getOpenAI, OPENAI_MODEL } from "@/lib/openai";
import { buildHumanizeSystem, buildHumanizeUser } from "@/lib/prompts";
import { runHumanizePipeline } from "@/lib/humanize";
import { analyzeText, type DetectorResult } from "@/lib/detector";
import { requireUser } from "@/lib/supabase/auth";
import { isCurrentPeriod, PLAN_LIMITS, remainingWords, type Plan } from "@/lib/usage";
import type { VoiceFingerprint } from "@/lib/voice";

export const maxDuration = 120;

const MAX_CHARS = 12000;

interface HumanizeBody {
  text: string;
  fingerprint?: VoiceFingerprint | null;
  targetScore?: number;
  maxPasses?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await requireUser();

    const body = (await req.json()) as HumanizeBody;
    const text = body.text?.trim();

    if (!text) {
      return Response.json({ error: "Nothing to humanize." }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return Response.json(
        { error: `Text is too long. Keep it under ${MAX_CHARS.toLocaleString()} characters.` },
        { status: 400 }
      );
    }

    const [{ data: profile }, { data: usage }] = await Promise.all([
      supabase.from("profiles").select("plan").eq("id", userId).single(),
      supabase.from("usage").select("words_used, period_start").eq("user_id", userId).single(),
    ]);
    const plan = (profile?.plan as Plan | undefined) ?? "free";
    const wordsUsed = usage && isCurrentPeriod(usage.period_start) ? usage.words_used : 0;
    const remaining = remainingWords(plan, wordsUsed);
    const requestedWords = analyzeText(text).wordCount;
    if (requestedWords > remaining) {
      throw new QuotaExceededError(plan, PLAN_LIMITS[plan]);
    }

    const client = getOpenAI();
    const system = buildHumanizeSystem(body.fingerprint ?? null);

    const outcome = await runHumanizePipeline(
      text,
      async ({ text: current, result, pass }) => {
        const completion = await client.chat.completions.create({
          model: OPENAI_MODEL,
          messages: [
            { role: "system", content: system },
            { role: "user", content: buildHumanizeUser(current, result, pass) },
          ],
        });
        return completion.choices[0]?.message?.content ?? "";
      },
      { targetScore: body.targetScore, maxPasses: body.maxPasses }
    );

    const outputWords = analyzeText(outcome.text).wordCount;
    const { data: updated } = (await supabase
      .rpc("increment_usage", { p_user_id: userId, p_words: outputWords })
      .single()) as { data: { words_used: number; plan: string } | null };

    return Response.json({
      text: outcome.text,
      before: summarize(outcome.before),
      after: summarize(outcome.after),
      passes: outcome.passes,
      model: OPENAI_MODEL,
      usage: {
        used: updated?.words_used ?? wordsUsed + outputWords,
        limit: PLAN_LIMITS[plan],
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Trim the detector result down to what the UI renders. */
function summarize(r: DetectorResult) {
  return { score: r.score, verdict: r.verdict, metrics: r.metrics };
}
