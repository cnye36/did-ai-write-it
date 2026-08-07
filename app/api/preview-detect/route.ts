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

/** Up to this many flagged (non-human) sentences are revealed, when the text
 *  has that many, so the free preview actually demonstrates the detector
 *  instead of gating on whichever sentence happens to be flagged first. */
const REVEAL_FLAGGED_TARGET = 5;
/** Sentences revealed when nothing is flagged at all, so a clean document
 *  still gets a short "about a paragraph" teaser instead of either the full
 *  report or nothing. */
const MIN_TEASER_SENTENCES = 4;

/**
 * Withhold sentence text server-side (not just visually) past the reveal
 * point, so the full result never round-trips to an anonymous client. Reveals
 * through the Nth flagged sentence, plus one sentence past it when one
 * exists, so the UI can show a blurred "flagged further down" teaser without
 * a second request.
 */
function revealableSentences(sentences: WinstonSentenceScore[]): WinstonSentenceScore[] {
  const flaggedCount = sentences.filter((s) => verdictFor(s.score) !== "human").length;

  if (flaggedCount === 0) {
    return sentences.slice(0, Math.min(sentences.length, MIN_TEASER_SENTENCES));
  }

  const target = Math.min(REVEAL_FLAGGED_TARGET, flaggedCount);
  let seen = 0;
  let cutoffIndex = sentences.length - 1;
  for (let i = 0; i < sentences.length; i++) {
    if (verdictFor(sentences[i].score) !== "human") {
      seen++;
      if (seen === target) {
        cutoffIndex = i;
        break;
      }
    }
  }
  return sentences.slice(0, Math.min(sentences.length, cutoffIndex + 2));
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
