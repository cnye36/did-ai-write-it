import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { generateDetectionInsight } from "@/lib/detection-insight";
import type { DetectRunResult } from "@/lib/runs";
import { requireUser } from "@/lib/supabase/auth";

export const maxDuration = 30;

interface InsightBody {
  runId?: string;
  versionId?: string;
}

function detectResult(value: unknown): DetectRunResult | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Partial<DetectRunResult>;
  if (
    !candidate.winston ||
    typeof candidate.winston.score !== "number" ||
    !Array.isArray(candidate.winston.sentences)
  ) {
    return null;
  }
  return candidate as DetectRunResult;
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId } = await requireUser();
    const body = (await req.json()) as InsightBody;
    if (!body.runId) {
      return Response.json({ error: "Report is required." }, { status: 400 });
    }

    const { data: run } = await supabase
      .from("runs")
      .select("id, input_text, result")
      .eq("id", body.runId)
      .eq("user_id", userId)
      .eq("kind", "detect")
      .maybeSingle();
    if (!run) {
      return Response.json({ error: "Report not found." }, { status: 404 });
    }

    let inputText = run.input_text as string;
    let storedResult = detectResult(run.result);
    let isCurrentVersion = !body.versionId;

    if (body.versionId) {
      const [{ data: version }, { data: latestVersion }] = await Promise.all([
        supabase
          .from("run_versions")
          .select("id, input_text, result")
          .eq("id", body.versionId)
          .eq("run_id", body.runId)
          .maybeSingle(),
        supabase
          .from("run_versions")
          .select("id")
          .eq("run_id", body.runId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (!version) {
        return Response.json({ error: "Report version not found." }, { status: 404 });
      }
      inputText = version.input_text as string;
      storedResult = detectResult(version.result);
      isCurrentVersion = latestVersion?.id === version.id;
    }

    if (!storedResult) {
      return Response.json({ error: "Detector result not found." }, { status: 400 });
    }
    if (storedResult.insight) {
      return Response.json({ insight: storedResult.insight });
    }

    const insight = await generateDetectionInsight({
      text: inputText,
      winston: storedResult.winston,
    });
    const nextResult = { ...storedResult, insight };

    if (body.versionId) {
      const { error } = await supabase
        .from("run_versions")
        .update({ result: nextResult })
        .eq("id", body.versionId)
        .eq("run_id", body.runId);
      if (error) throw error;
    }

    if (isCurrentVersion) {
      const { error } = await supabase
        .from("runs")
        .update({ result: nextResult })
        .eq("id", body.runId)
        .eq("user_id", userId);
      if (error) throw error;
    }

    return Response.json({ insight });
  } catch (err) {
    return errorResponse(err);
  }
}
