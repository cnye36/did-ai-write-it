import { NextRequest } from "next/server";
import { getClient, MODEL } from "@/lib/anthropic";
import { errorResponse } from "@/lib/api-errors";
import { buildGenerateSystem } from "@/lib/prompts";
import { requireUser } from "@/lib/supabase/auth";
import type { ContentFormat, VoiceFingerprint } from "@/lib/voice";

export const maxDuration = 120;

interface GenerateBody {
  fingerprint: VoiceFingerprint;
  samples: string[];
  format: ContentFormat;
  topic: string;
  notes: string;
}

export async function POST(req: NextRequest) {
  try {
    await requireUser();

    const body = (await req.json()) as GenerateBody;
    if (!body.fingerprint || !body.topic?.trim()) {
      return Response.json(
        { error: "A voice profile and a topic are required." },
        { status: 400 }
      );
    }

    const client = getClient();
    const stream = client.messages.stream({
      model: MODEL,
      max_tokens: 2500,
      system: buildGenerateSystem(body.fingerprint, body.samples ?? [], body.format),
      messages: [
        {
          role: "user",
          content: `Topic: ${body.topic.trim()}\n\nMy raw thoughts and material to work from:\n${(body.notes ?? "").trim() || "(none provided, work from the topic)"}`,
        },
      ],
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const event of stream) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch (err) {
    return errorResponse(err);
  }
}
