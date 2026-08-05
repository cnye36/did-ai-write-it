import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { analyzeText } from "@/lib/detector";
import { REWRITE_ASSIST_MAX_CHARS, rewriteWholeDocument } from "@/lib/rewrite-assist";
import { requireUser } from "@/lib/supabase/auth";
import {
  assertWithinQuota,
  incrementUsage,
  isDevBypass,
  PLAN_LIMITS,
  rewriteAssistQuotaWords,
  safeRefundUsage,
  wordsUsedInCurrentPeriod,
  type Plan,
} from "@/lib/usage";

export const maxDuration = 60;

interface RewriteAllBody {
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId, email } = await requireUser();

    const body = (await req.json()) as RewriteAllBody;
    const text = body.text?.trim();

    if (!text) {
      return Response.json({ error: "Nothing to rewrite." }, { status: 400 });
    }
    if (text.length > REWRITE_ASSIST_MAX_CHARS) {
      return Response.json(
        {
          error: `Text is too long. Keep it under ${REWRITE_ASSIST_MAX_CHARS.toLocaleString()} characters.`,
        },
        { status: 400 }
      );
    }

    const [{ data: profile }, { data: usage }] = await Promise.all([
      supabase.from("profiles").select("plan").eq("id", userId).single(),
      supabase.from("usage").select("words_used, period_start").eq("user_id", userId).single(),
    ]);
    const plan = (profile?.plan as Plan | undefined) ?? "free";
    const wordsUsed = wordsUsedInCurrentPeriod(usage?.period_start, usage?.words_used);
    const result = analyzeText(text);
    const quotaWords = rewriteAssistQuotaWords(result.wordCount);
    const bypass = isDevBypass(email);
    assertWithinQuota(plan, wordsUsed, quotaWords, bypass);

    const updatedWordsUsed = await incrementUsage(supabase, userId, quotaWords, plan, bypass);
    try {
      const rewritten = await rewriteWholeDocument({ text, result });
      return Response.json({
        text: rewritten,
        usage: {
          used: updatedWordsUsed,
          limit: PLAN_LIMITS[plan],
        },
      });
    } catch (err) {
      await safeRefundUsage(userId, quotaWords);
      throw err;
    }
  } catch (err) {
    return errorResponse(err);
  }
}
