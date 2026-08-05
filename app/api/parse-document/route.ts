import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { requireUser } from "@/lib/supabase/auth";

export const maxDuration = 30;

const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_EXTRACTED_CHARS = 150_000;

function isPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 1024).includes(Buffer.from("%PDF-"));
}

function isZip(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

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
      if (!isPdf(buffer)) {
        return Response.json({ error: "This file is not a valid PDF." }, { status: 400 });
      }
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      try {
        text = (await parser.getText()).text;
      } finally {
        await parser.destroy();
      }
    } else if (name.endsWith(".docx")) {
      if (!isZip(buffer)) {
        return Response.json({ error: "This file is not a valid DOCX document." }, { status: 400 });
      }
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
    if (text.length > MAX_EXTRACTED_CHARS) {
      return Response.json(
        {
          error: `This document contains too much text. Keep it under ${MAX_EXTRACTED_CHARS.toLocaleString()} characters.`,
        },
        { status: 400 }
      );
    }

    return Response.json({ text });
  } catch (err) {
    return errorResponse(err);
  }
}
