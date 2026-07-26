import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { scoreWithWinston } from "@/lib/winston";
import { createServiceClient } from "@/lib/supabase/service";

export const maxDuration = 30;

/** Free anonymous checks per IP per rolling 24h. Only successful Winston checks count. */
const DAILY_LIMIT = 5;
/** Hard cap on how much of the pasted text gets sent to Winston, independent of any client cap. */
const MAX_WORDS = 300;

interface PreviewBody {
  text: string;
}

function truncateToWords(text: string, maxWords: number): string {
  const words = text.split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PreviewBody;
    const text = truncateToWords(body.text?.trim() ?? "", MAX_WORDS);

    if (!text) {
      return Response.json({ error: "Nothing to check." }, { status: 400 });
    }

    const ip = getClientIp(req);
    const supabase = createServiceClient();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await supabase
      .from("preview_checks")
      .select("id", { count: "exact", head: true })
      .eq("ip", ip)
      .gte("created_at", since);

    // Fail closed: if the rate limit can't be verified, don't spend Winston
    // credits. This is a cost-control gate, so a broken/unreachable count
    // query must reject the request, not silently allow it through.
    if (countError) {
      console.error("preview_checks count query failed:", countError);
      return Response.json(
        { error: "Check temporarily unavailable. Try again shortly." },
        { status: 503 }
      );
    }

    if ((count ?? 0) >= DAILY_LIMIT) {
      return Response.json(
        { error: "You've used your free checks for today. Sign up free to keep going." },
        { status: 429 }
      );
    }

    const winston = await scoreWithWinston(text);

    // Nothing billable happened: don't spend a rate-limit slot on it.
    if (!winston) {
      return Response.json({ winston: null });
    }

    const { error: insertError } = await supabase.from("preview_checks").insert({ ip });
    if (insertError) {
      console.error("preview_checks insert failed:", insertError);
    }

    return Response.json({
      winston: { score: winston.score, sentences: winston.sentences },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
