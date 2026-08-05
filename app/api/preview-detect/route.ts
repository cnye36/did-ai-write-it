import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import {
  DETECT_MAX_CHARS,
  isWinstonConfigured,
  MIN_WORDS_FOR_CHECK,
  scoreWithWinston,
  type WinstonSentenceScore,
} from "@/lib/winston";
import { createServiceClient } from "@/lib/supabase/service";
import { countWords, verdictFor } from "@/lib/detector";

export const maxDuration = 30;

/** Free anonymous checks per IP per rolling 24h. Only successful Winston checks count. */
const DAILY_LIMIT = 3;
/**
 * Hard cap on the free preview's length. Unlike the old behavior, text over
 * this cap is rejected outright rather than silently truncated: detectors
 * are unreliable on partial text, so the user trims it themselves or signs
 * up for the full-length check instead.
 */
const MAX_WORDS = 500;

interface PreviewBody {
  text: string;
}

/** Vercel overwrites these headers with the public client IP. The fallback
 *  keeps local development usable behind a conventional trusted proxy. */
function getClientIp(req: NextRequest): string | null {
  const vercelForwarded = req.headers.get("x-vercel-forwarded-for")?.trim();
  if (vercelForwarded) return vercelForwarded;

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const parts = forwarded.split(",");
    return parts[parts.length - 1].trim();
  }
  return null;
}

/** Match the existing UI rule: reveal through the first flagged sentence,
 *  while keeping all later sentence text out of the anonymous API response. */
function revealableSentences(sentences: WinstonSentenceScore[]): WinstonSentenceScore[] {
  const firstFlagged = sentences.findIndex((sentence) => verdictFor(sentence.score) !== "human");
  return firstFlagged === -1 ? sentences : sentences.slice(0, firstFlagged + 1);
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<PreviewBody>;
    if (typeof body.text !== "string") {
      return Response.json({ error: "Text must be a string." }, { status: 400 });
    }
    const text = body.text.trim();

    if (!text) {
      return Response.json({ error: "Nothing to check." }, { status: 400 });
    }
    if (text.length > DETECT_MAX_CHARS) {
      return Response.json(
        {
          error: `Text is too long. Keep it under ${DETECT_MAX_CHARS.toLocaleString()} characters.`,
        },
        { status: 400 }
      );
    }

    const wordCount = countWords(text);
    if (wordCount < MIN_WORDS_FOR_CHECK) {
      return Response.json(
        {
          error: `Add at least ${MIN_WORDS_FOR_CHECK} words. Detectors are unreliable on shorter text.`,
        },
        { status: 400 }
      );
    }
    if (wordCount > MAX_WORDS) {
      return Response.json(
        {
          error: `Free checks are limited to ${MAX_WORDS} words. Trim your text or sign up free to check longer text.`,
        },
        { status: 400 }
      );
    }

    if (!isWinstonConfigured()) {
      return Response.json(
        { error: "Check temporarily unavailable. Try again shortly." },
        { status: 503 }
      );
    }

    const ip = getClientIp(req);
    if (!ip) {
      return Response.json(
        { error: "Check temporarily unavailable. Try again shortly." },
        { status: 503 }
      );
    }
    const supabase = createServiceClient();

    const { data: slotConsumed, error: slotError } = await supabase.rpc(
      "consume_preview_slot",
      {
        p_ip: ip,
        p_limit: DAILY_LIMIT,
      }
    );

    if (slotError) {
      console.error("Failed to reserve preview slot:", slotError.message);
      return Response.json(
        { error: "Check temporarily unavailable. Try again shortly." },
        { status: 503 }
      );
    }

    if (!slotConsumed) {
      return Response.json(
        { error: "You've used your free checks for today. Sign up free to keep going." },
        { status: 429 }
      );
    }

    const winston = await scoreWithWinston(text);

    if (!winston) {
      return Response.json(
        { error: "Check temporarily unavailable. Try again shortly." },
        { status: 503 }
      );
    }

    const sentences = revealableSentences(winston.sentences);

    return Response.json({
      winston: {
        score: winston.score,
        sentences,
        totalSentenceCount: winston.sentences.length,
      },
    }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
