import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { requireUser } from "@/lib/supabase/auth";
import { insertFeedback, type FeedbackKind } from "@/lib/feedback";
import { sendFeedbackNotification } from "@/lib/resend";

const MAX_MESSAGE_CHARS = 4000;

interface FeedbackBody {
  kind: FeedbackKind;
  message: string;
  pageUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId, email } = await requireUser();

    const body = (await req.json()) as FeedbackBody;
    const message = body.message?.trim();
    const kind = body.kind;

    if (kind !== "bug" && kind !== "feedback") {
      return Response.json({ error: "Invalid feedback type." }, { status: 400 });
    }
    if (!message) {
      return Response.json({ error: "Add a message before sending." }, { status: 400 });
    }
    if (message.length > MAX_MESSAGE_CHARS) {
      return Response.json(
        { error: `Keep it under ${MAX_MESSAGE_CHARS.toLocaleString()} characters.` },
        { status: 400 }
      );
    }

    const ok = await insertFeedback(supabase, {
      userId,
      kind,
      message,
      pageUrl: body.pageUrl?.slice(0, 500) ?? null,
    });
    if (!ok) {
      return Response.json({ error: "Could not send feedback." }, { status: 500 });
    }

    await sendFeedbackNotification({ email, kind, message, pageUrl: body.pageUrl });

    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
