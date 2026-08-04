import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { analyzeText } from "@/lib/detector";
import { insertRun } from "@/lib/runs";
import { scoreWithPlagiarism, PLAGIARISM_MAX_CHARS, MIN_WORDS_FOR_CHECK } from "@/lib/winston";
import { requireUser } from "@/lib/supabase/auth";
import {
  assertWithinQuota,
  incrementUsage,
  isDevBypass,
  PLAN_LIMITS,
  PLAGIARISM_WORD_MULTIPLIER,
  wordsUsedInCurrentPeriod,
  type Plan,
} from "@/lib/usage";

export const maxDuration = 60;

interface PlagiarismBody {
  text: string;
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId, email } = await requireUser();

    const body = (await req.json()) as PlagiarismBody;
    const text = body.text?.trim();

    if (!text) {
      return Response.json({ error: "Nothing to check." }, { status: 400 });
    }
    if (text.length > PLAGIARISM_MAX_CHARS) {
      return Response.json(
        {
          error: `Text is too long. Keep it under ${PLAGIARISM_MAX_CHARS.toLocaleString()} characters.`,
        },
        { status: 400 }
      );
    }
    const wordCount = analyzeText(text).wordCount;
    if (wordCount < MIN_WORDS_FOR_CHECK) {
      return Response.json(
        {
          error: `Text is too short for a reliable result. Add at least ${MIN_WORDS_FOR_CHECK} words (this text is ${wordCount}).`,
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
    const quotaWords = wordCount * PLAGIARISM_WORD_MULTIPLIER;
    const bypass = isDevBypass(email);
    assertWithinQuota(plan, wordsUsed, quotaWords, bypass);

    const plagiarism = await scoreWithPlagiarism(text);

    // Nothing billable happened (unconfigured, too short, or the request
    // failed): return the null result without touching the quota.
    if (!plagiarism) {
      return Response.json({
        plagiarism: null,
        usage: { used: wordsUsed, limit: PLAN_LIMITS[plan] },
      });
    }

    const updatedWordsUsed = await incrementUsage(supabase, userId, quotaWords, plan, bypass);

    const runId = await insertRun(supabase, {
      userId,
      kind: "plagiarism",
      inputText: text,
      wordCount,
      score: plagiarism.score,
      result: { plagiarism },
    });

    return Response.json({
      plagiarism,
      runId,
      usage: {
        used: updatedWordsUsed,
        limit: PLAN_LIMITS[plan],
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
