import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { analyzeText } from "@/lib/detector";
import { appendRunVersion, insertRun, insertRunVersion } from "@/lib/runs";
import { scoreWithWinston, DETECT_MAX_CHARS } from "@/lib/winston";
import { requireUser } from "@/lib/supabase/auth";
import { assertWithinQuota, isDevBypass, PLAN_LIMITS, wordsUsedInCurrentPeriod, type Plan } from "@/lib/usage";

export const maxDuration = 30;

const MAX_CHARS = DETECT_MAX_CHARS;

interface DetectBody {
  text: string;
  /** Present when rescanning from the AI editor: appends a new version to
   *  this existing run instead of creating a brand new sidebar entry. */
  runId?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId, email } = await requireUser();

    const body = (await req.json()) as DetectBody;
    const text = body.text?.trim();
    const runId = body.runId;

    if (!text) {
      return Response.json({ error: "Nothing to check." }, { status: 400 });
    }
    if (text.length > MAX_CHARS) {
      return Response.json(
        { error: `Text is too long. Keep it under ${MAX_CHARS.toLocaleString()} characters.` },
        { status: 400 }
      );
    }

    if (runId) {
      const { data: existing } = await supabase
        .from("runs")
        .select("id")
        .eq("id", runId)
        .eq("user_id", userId)
        .eq("kind", "detect")
        .maybeSingle();
      if (!existing) {
        return Response.json({ error: "Report not found." }, { status: 400 });
      }
    }

    const [{ data: profile }, { data: usage }] = await Promise.all([
      supabase.from("profiles").select("plan").eq("id", userId).single(),
      supabase.from("usage").select("words_used, period_start").eq("user_id", userId).single(),
    ]);
    const plan = (profile?.plan as Plan | undefined) ?? "free";
    const wordsUsed = wordsUsedInCurrentPeriod(usage?.period_start, usage?.words_used);
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

    const winstonPayload = { score: winston.score, sentences: winston.sentences };
    const runResult = { winston: winstonPayload };
    let resultRunId: string | null;

    if (runId) {
      await appendRunVersion(supabase, {
        runId,
        inputText: text,
        wordCount: requestedWords,
        score: winston.score,
        result: runResult,
      });
      resultRunId = runId;
    } else {
      resultRunId = await insertRun(supabase, {
        userId,
        kind: "detect",
        inputText: text,
        wordCount: requestedWords,
        score: winston.score,
        result: runResult,
      });
      if (resultRunId) {
        await insertRunVersion(supabase, {
          runId: resultRunId,
          inputText: text,
          wordCount: requestedWords,
          score: winston.score,
          result: runResult,
        });
      }
    }

    return Response.json({
      winston: winstonPayload,
      runId: resultRunId,
      usage: {
        used: updated?.words_used ?? wordsUsed + requestedWords,
        limit: PLAN_LIMITS[plan],
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
