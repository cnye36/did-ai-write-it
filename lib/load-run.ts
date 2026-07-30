import { createClient } from "@/lib/supabase/server";
import { listRunVersions } from "@/lib/runs";
import type { RunKind, RunRow, RunVersion } from "@/lib/runs";

/** Load a single run owned by the current user, matching `kind`. Returns null if missing. */
export async function loadOwnedRun(id: string, kind: RunKind): Promise<RunRow | null> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return null;

  const { data, error } = await supabase
    .from("runs")
    .select("id, kind, title, input_text, word_count, score, result, doc, created_at, updated_at")
    .eq("id", id)
    .eq("user_id", userId)
    .eq("kind", kind)
    .maybeSingle();

  /*
    A query error and a genuinely missing row both end up as null for the
    caller, but they are not the same thing and must not look the same in the
    logs. Collapsing them silently turned a pending migration (the `doc` column
    not existing yet) into a blank page with a run id in the URL and no clue
    why, which is exactly the kind of failure that costs an afternoon.
  */
  if (error) {
    console.error(`loadOwnedRun failed for ${kind} run ${id}: ${error.message}`);
    return null;
  }
  return (data as RunRow | null) ?? null;
}

/** Version history for a run. Only call after loadOwnedRun succeeds; RLS on
 *  run_versions already scopes rows via the parent run's ownership. */
export async function loadRunVersions(runId: string): Promise<RunVersion[]> {
  const supabase = await createClient();
  return listRunVersions(supabase, runId);
}
