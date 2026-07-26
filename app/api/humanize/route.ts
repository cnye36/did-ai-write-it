import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { buildHumanizeSystem, buildHumanizeUser } from "@/lib/prompts";
import { runHumanizePipeline } from "@/lib/humanize";
import { analyzeText, type DetectorResult } from "@/lib/detector";
import { generateBestRewrite, getModelLabel } from "@/lib/rewrite";
import { winstonScoreOnly } from "@/lib/winston";
import { requireUser } from "@/lib/supabase/auth";
import { assertWithinQuota, isCurrentPeriod, isDevBypass, PLAN_LIMITS, type Plan } from "@/lib/usage";

export const maxDuration = 120;

const MAX_CHARS = 12000;

interface HumanizeBody {
  text: string;
  targetScore?: number;
  maxPasses?: number;
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId, email } = await requireUser();

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
    const requestedWords = analyzeText(text).wordCount;
    const bypass = isDevBypass(email);
    assertWithinQuota(plan, wordsUsed, requestedWords, bypass);

    const system = buildHumanizeSystem();

    const outcome = await runHumanizePipeline(
      text,
      ({ text: current, result, pass }) =>
        generateBestRewrite(system, buildHumanizeUser(current, result, pass)),
      {
        targetScore: body.targetScore,
        maxPasses: body.maxPasses,
        // Real-detector check (M4b): drives accept/reject and the stop
        // condition when available, not just a before/after report. Called
        // on every candidate, so this is where most of the Winston credit
        // spend on a request goes.
        scoreExternally: winstonScoreOnly,
      }
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
      model: getModelLabel(),
      winston: summarizeWinston(outcome.externalBefore, outcome.externalAfter),
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

/** null when Winston isn't configured, the text was too short, or every request failed. */
function summarizeWinston(before: number | null | undefined, after: number | null | undefined) {
  if (before == null || after == null) return null;
  return { before: { score: before }, after: { score: after } };
}
