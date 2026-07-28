import type { SupabaseClient } from "@supabase/supabase-js";
import type { FactCheckResult, PlagiarismResult, WinstonSentenceScore } from "@/lib/winston";

export type RunKind = "detect" | "plagiarism" | "fact_check" | "humanize";

export interface DetectRunResult {
  winston: { score: number; sentences: WinstonSentenceScore[] };
}

export interface PlagiarismRunResult {
  plagiarism: PlagiarismResult;
}

export interface FactCheckRunResult {
  factCheck: FactCheckResult;
}

export type RunResult = DetectRunResult | PlagiarismRunResult | FactCheckRunResult | Record<string, unknown>;

export interface RunListItem {
  id: string;
  kind: RunKind;
  title: string;
  word_count: number;
  score: number | null;
  created_at: string;
}

export interface RunRow extends RunListItem {
  input_text: string;
  result: RunResult;
}

export const RUN_KIND_LABEL: Record<RunKind, string> = {
  detect: "Detector",
  plagiarism: "Plagiarism",
  fact_check: "Fact check",
  humanize: "Humanize",
};

export const RUN_KIND_HREF: Record<RunKind, string> = {
  detect: "/app/detect",
  plagiarism: "/app/plagiarism",
  fact_check: "/app/fact-check",
  humanize: "/app/humanize",
};

/** First ~72 chars of the input, collapsed to one line, for the sidebar. */
export function titleFromText(text: string, max = 72): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine || "Untitled report";
  return `${oneLine.slice(0, max - 1).trimEnd()}…`;
}

export async function insertRun(
  supabase: SupabaseClient,
  opts: {
    userId: string;
    kind: RunKind;
    inputText: string;
    wordCount: number;
    score: number | null;
    result: RunResult;
  }
): Promise<string | null> {
  const { data, error } = await supabase
    .from("runs")
    .insert({
      user_id: opts.userId,
      kind: opts.kind,
      title: titleFromText(opts.inputText),
      input_text: opts.inputText,
      word_count: opts.wordCount,
      score: opts.score,
      result: opts.result,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to save run:", error.message);
    return null;
  }
  return data.id as string;
}
