import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { analyzeText } from "@/lib/detector";
import { scoreWithWinston } from "@/lib/winston";
import { requireUser } from "@/lib/supabase/auth";
import { assertWithinQuota, isCurrentPeriod, isDevBypass, PLAN_LIMITS, type Plan } from "@/lib/usage";

export const maxDuration = 30;

const MAX_CHARS = 12000;

interface DetectBody {
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId, email } = await requireUser();

    const body = (await req.json()) as DetectBody;
    const text = body.text?.trim();

    if (!text) {
      return Response.json({ error: "Nothing to check." }, { status: 400 });
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

    const winston = await scoreWithWinston(text);

    // Nothing billable happened (unconfigured, too short, or the request
    // failed): return the null result without touching the quota.
    if (!winston) {
      return Response.json({
        winston: null,
        usage: { used: wordsUsed, limit: PLAN_LIMITS[plan] },
      });
    }

    const { data: updated } = (await supabase
      .rpc("increment_usage", { p_user_id: userId, p_words: requestedWords })
      .single()) as { data: { words_used: number; plan: string } | null };

    return Response.json({
      winston: { score: winston.score, sentences: winston.sentences },
      usage: {
        used: updated?.words_used ?? wordsUsed + requestedWords,
        limit: PLAN_LIMITS[plan],
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
