import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { requireUser } from "@/lib/supabase/auth";

export const maxDuration = 30;

/** Generous cap on the uploaded file itself, well above any plan's per-request character limit. */
const MAX_FILE_BYTES = 25 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    await requireUser();

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return Response.json(
        { error: `File is too large. Keep it under ${MAX_FILE_BYTES / (1024 * 1024)}MB.` },
        { status: 400 }
      );
    }

    const name = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    let text: string;
    if (name.endsWith(".pdf")) {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        text = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    } else if (name.endsWith(".docx")) {
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer })).value;
    } else {
      return Response.json(
        { error: "Unsupported file type. Upload a .pdf or .docx file." },
        { status: 400 }
      );
    }

    if (!text.trim()) {
      return Response.json({ error: "Couldn't find any text in that file." }, { status: 400 });
    }

    return Response.json({ text });
  } catch (err) {
    return errorResponse(err);
  }
}
