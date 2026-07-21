import { NextRequest } from "next/server";
import { getClient, MODEL } from "@/lib/anthropic";
import { errorResponse } from "@/lib/api-errors";
import { ANALYZE_VOICE_SYSTEM } from "@/lib/prompts";
import { requireUser } from "@/lib/supabase/auth";
import type { VoiceFingerprint } from "@/lib/voice";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    await requireUser();

    const { samples } = (await req.json()) as { samples?: string[] };
    const clean = (samples ?? []).map((s) => s.trim()).filter(Boolean);
    if (clean.length < 3) {
      return Response.json(
        { error: "Provide at least 3 writing samples." },
        { status: 400 }
      );
    }

    const client = getClient();
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: ANALYZE_VOICE_SYSTEM,
      messages: [
        {
          role: "user",
          content: clean
            .map((s, i) => `<sample_${i + 1}>\n${s}\n</sample_${i + 1}>`)
            .join("\n\n"),
        },
      ],
    });

    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const jsonText = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
    const fingerprint = JSON.parse(jsonText) as VoiceFingerprint;

    return Response.json({ fingerprint });
  } catch (err) {
    if (err instanceof SyntaxError) {
      return Response.json(
        { error: "The analysis came back malformed. Try again." },
        { status: 502 }
      );
    }
    return errorResponse(err);
  }
}
