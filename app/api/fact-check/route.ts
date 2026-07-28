import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { analyzeText } from "@/lib/detector";
import { insertRun } from "@/lib/runs";
import { checkFacts, FACT_CHECK_MAX_CHARS } from "@/lib/winston";
import { requireUser } from "@/lib/supabase/auth";
import {
  assertWithinQuota,
  isCurrentPeriod,
  isDevBypass,
  PLAN_LIMITS,
  FACT_CHECK_WORD_MULTIPLIER,
  type Plan,
} from "@/lib/usage";

export const maxDuration = 60;

interface FactCheckBody {
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId, email } = await requireUser();

    const body = (await req.json()) as FactCheckBody;
    const text = body.text?.trim();

    if (!text) {
      return Response.json({ error: "Nothing to check." }, { status: 400 });
    }
    if (text.length > FACT_CHECK_MAX_CHARS) {
      return Response.json(
        {
          error: `Text is too long. Keep it under ${FACT_CHECK_MAX_CHARS.toLocaleString()} characters.`,
        },
        { status: 400 }
      );
    }

    const [{ data: profile }, { data: usage }] = await Promise.all([
      supabase.from("profiles").select("plan").eq("id", userId).single(),
      supabase.from("usage").select("words_used, period_start").eq("user_id", userId).single(),
    ]);
    const plan = (profile?.plan as Plan | undefined) ?? "free";
    const wordsUsed = usage && isCurrentPeriod(usage.period_start) ? usage.words_used : 0;
    const wordCount = analyzeText(text).wordCount;
    const quotaWords = wordCount * FACT_CHECK_WORD_MULTIPLIER;
    const bypass = isDevBypass(email);
    assertWithinQuota(plan, wordsUsed, quotaWords, bypass);

    const factCheck = await checkFacts(text);

    // Nothing billable happened (unconfigured, too short, or the request
    // failed): return the null result without touching the quota.
    if (!factCheck) {
      return Response.json({
        factCheck: null,
        usage: { used: wordsUsed, limit: PLAN_LIMITS[plan] },
      });
    }

    const { data: updated } = (await supabase
      .rpc("increment_usage", { p_user_id: userId, p_words: quotaWords })
      .single()) as { data: { words_used: number; plan: string } | null };

    const runId = await insertRun(supabase, {
      userId,
      kind: "fact_check",
      inputText: text,
      wordCount,
      score: factCheck.score,
      result: { factCheck },
    });

    return Response.json({
      factCheck,
      runId,
      usage: {
        used: updated?.words_used ?? wordsUsed + quotaWords,
        limit: PLAN_LIMITS[plan],
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
