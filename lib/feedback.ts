import type { SupabaseClient } from "@supabase/supabase-js";

export type FeedbackKind = "bug" | "feedback";

export const FEEDBACK_KIND_LABEL: Record<FeedbackKind, string> = {
  bug: "Bug",
  feedback: "Feedback",
};

export interface FeedbackRow {
  id: string;
  kind: FeedbackKind;
  message: string;
  page_url: string | null;
  created_at: string;
}

export async function insertFeedback(
  supabase: SupabaseClient,
  opts: { userId: string; kind: FeedbackKind; message: string; pageUrl: string | null }
): Promise<boolean> {
  const { error } = await supabase.from("feedback").insert({
    user_id: opts.userId,
    kind: opts.kind,
    message: opts.message,
    page_url: opts.pageUrl,
  });

  if (error) {
    console.error("Failed to save feedback:", error.message);
    return false;
  }
  return true;
}
