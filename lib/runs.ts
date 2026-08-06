import type { SupabaseClient } from "@supabase/supabase-js";
import type { FactCheckResult, PlagiarismResult, WinstonSentenceScore } from "@/lib/winston";

export type RunKind = "detect" | "plagiarism" | "fact_check";

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
  updated_at: string;
}

export interface RunRow extends RunListItem {
  input_text: string;
  result: RunResult;
  /** ProseMirror JSON from the rich editor. Null for anything saved before it
   *  shipped, in which case the editor rebuilds a document from input_text. */
  doc: object | null;
}

/** One detect scan within a run's history. Version 1 is created alongside the
 *  run itself; a manual rescan from the AI editor appends another one instead
 *  of creating a whole new run. */
export interface RunVersion {
  id: string;
  input_text: string;
  word_count: number;
  score: number | null;
  result: RunResult;
  doc: object | null;
  created_at: string;
}

export const RUN_KIND_LABEL: Record<RunKind, string> = {
  detect: "Detector",
  plagiarism: "Plagiarism",
  fact_check: "Fact check",
};

export const RUN_KIND_HREF: Record<RunKind, string> = {
  detect: "/app/detect",
  plagiarism: "/app/plagiarism",
  fact_check: "/app/fact-check",
};

/** Absolute date/time for a report, e.g. "Jul 31, 2:14 PM" — used wherever a
 *  relative "3h ago" isn't precise enough (version tabs, the diff modal). */
export function formatRunDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** First ~72 chars of the input, collapsed to one line, for the sidebar. */
export function titleFromText(text: string, max = 72): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine || "Untitled report";
  return `${oneLine.slice(0, max - 1).trimEnd()}…`;
}

/** `runs.score` / `run_versions.score` are integers; Winston often returns
 *  fractions (e.g. 97.42). Round at the write boundary so every caller is safe. */
function scoreToInt(score: number | null): number | null {
  return score == null ? null : Math.round(score);
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
      score: scoreToInt(opts.score),
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

interface RunVersionInput {
  runId: string;
  inputText: string;
  wordCount: number;
  score: number | null;
  result: RunResult;
  /** ProseMirror JSON, when the scan came from the rich editor. */
  doc?: object | null;
}

/** First version for a freshly created run, so version history always has a
 *  complete baseline from birth. Call right after insertRun succeeds. */
export async function insertRunVersion(
  supabase: SupabaseClient,
  { runId, inputText, wordCount, score, result, doc = null }: RunVersionInput
): Promise<void> {
  const { error } = await supabase.from("run_versions").insert({
    run_id: runId,
    input_text: inputText,
    word_count: wordCount,
    score: scoreToInt(score),
    result,
    doc,
  });
  if (error) console.error("Failed to save run version:", error.message);
}

/** A manual rescan of an existing run: appends a new version and mirrors it
 *  onto the parent run so every other read path (sidebar, loadOwnedRun) just
 *  keeps working unchanged. Title and created_at stay frozen; updated_at
 *  moves so the sidebar's relative time doesn't look permanently stale. */
export async function appendRunVersion(
  supabase: SupabaseClient,
  { runId, inputText, wordCount, score, result, doc = null }: RunVersionInput
): Promise<void> {
  await insertRunVersion(supabase, { runId, inputText, wordCount, score, result, doc });

  const { error } = await supabase
    .from("runs")
    .update({
      input_text: inputText,
      word_count: wordCount,
      score: scoreToInt(score),
      result,
      doc,
      updated_at: new Date().toISOString(),
    })
    .eq("id", runId);

  if (error) console.error("Failed to update run:", error.message);
}

export async function listRunVersions(
  supabase: SupabaseClient,
  runId: string
): Promise<RunVersion[]> {
  const { data, error } = await supabase
    .from("run_versions")
    .select("id, input_text, word_count, score, result, doc, created_at")
    .eq("run_id", runId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to load run versions:", error.message);
    return [];
  }
  return (data ?? []) as RunVersion[];
}
