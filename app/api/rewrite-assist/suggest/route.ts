import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { analyzeText } from "@/lib/detector";
import { REWRITE_ASSIST_SELECTION_MAX_CHARS, suggestRewrites } from "@/lib/rewrite-assist";
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

export const maxDuration = 30;

interface SuggestBody {
  text: string;
  start: number;
  end: number;
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId, email } = await requireUser();

    const body = (await req.json()) as SuggestBody;
    const text = body.text ?? "";
    const start = body.start;
    const end = body.end;

    if (
      typeof start !== "number" ||
      typeof end !== "number" ||
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      end <= start ||
      end > text.length
    ) {
      return Response.json({ error: "Invalid selection." }, { status: 400 });
    }
    if (end - start > REWRITE_ASSIST_SELECTION_MAX_CHARS) {
      return Response.json(
        {
          error: `Selection is too long. Keep it under ${REWRITE_ASSIST_SELECTION_MAX_CHARS.toLocaleString()} characters.`,
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
    const wordCount = analyzeText(text.slice(start, end)).wordCount;
    const quotaWords = rewriteAssistQuotaWords(wordCount);
    const bypass = isDevBypass(email);
    assertWithinQuota(plan, wordsUsed, quotaWords, bypass);

    const updatedWordsUsed = await incrementUsage(supabase, userId, quotaWords, plan, bypass);
    try {
      const suggestions = await suggestRewrites({ fullText: text, start, end });
      return Response.json({
        suggestions,
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
