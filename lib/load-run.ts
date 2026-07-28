import { createClient } from "@/lib/supabase/server";
import type { RunKind, RunRow } from "@/lib/runs";

/** Load a single run owned by the current user, matching `kind`. Returns null if missing. */
export async function loadOwnedRun(id: string, kind: RunKind): Promise<RunRow | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("runs")
    .select("id, kind, title, input_text, word_count, score, result, created_at")
    .eq("id", id)
    .eq("user_id", userId)
    .eq("kind", kind)
    .maybeSingle();

  if (error || !data) return null;
  return data as RunRow;
}
