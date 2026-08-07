import { createClient } from "@/lib/supabase/server";
import { listRunVersions } from "@/lib/runs";
import type { RunKind, RunListItem, RunRow, RunVersion } from "@/lib/runs";

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

export const REPORTS_PAGE_SIZE = 20;

export type RunSort = "newest" | "oldest" | "score_desc" | "score_asc";

export interface RunListQuery {
  kind?: RunKind;
  q?: string;
  sort?: RunSort;
  page?: number;
}

export interface RunListPage {
  runs: RunListItem[];
  /** Total rows matching the current kind + search, for pagination. */
  total: number;
  /** Per-kind counts (respecting the current search only, not the kind
   *  filter) for the tab badges, so switching tabs shows accurate counts. */
  counts: Record<"all" | RunKind, number>;
}

const EMPTY_PAGE: RunListPage = {
  runs: [],
  total: 0,
  counts: { all: 0, detect: 0, plagiarism: 0, fact_check: 0 },
};

/** Full, filterable/sortable/paginated list of the current user's runs, for
 *  the dedicated Reports page. Unlike the sidebar's flat `.limit(100)` fetch,
 *  this queries the whole table so search and pagination work past that cap. */
export async function listOwnedRuns(query: RunListQuery): Promise<RunListPage> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  if (!userId) return EMPTY_PAGE;

  const q = query.q?.trim() ?? "";
  const sort = query.sort ?? "newest";
  const page = Math.max(1, query.page ?? 1);

  async function countFor(kind?: RunKind): Promise<number> {
    let builder = supabase.from("runs").select("id", { count: "exact", head: true }).eq("user_id", userId);
    if (kind) builder = builder.eq("kind", kind);
    if (q) builder = builder.ilike("title", `%${q}%`);
    const { count, error } = await builder;
    if (error) {
      console.error(`listOwnedRuns count failed (${kind ?? "all"}):`, error.message);
      return 0;
    }
    return count ?? 0;
  }

  const [all, detect, plagiarism, factCheck] = await Promise.all([
    countFor(),
    countFor("detect"),
    countFor("plagiarism"),
    countFor("fact_check"),
  ]);
  const counts = { all, detect, plagiarism, fact_check: factCheck };
  const total = query.kind ? counts[query.kind] : counts.all;

  const from = (page - 1) * REPORTS_PAGE_SIZE;
  const to = from + REPORTS_PAGE_SIZE - 1;

  let listBuilder = supabase
    .from("runs")
    .select("id, kind, title, word_count, score, created_at, updated_at")
    .eq("user_id", userId);
  if (query.kind) listBuilder = listBuilder.eq("kind", query.kind);
  if (q) listBuilder = listBuilder.ilike("title", `%${q}%`);
  listBuilder =
    sort === "oldest"
      ? listBuilder.order("created_at", { ascending: true })
      : sort === "score_desc"
        ? listBuilder.order("score", { ascending: false, nullsFirst: false })
        : sort === "score_asc"
          ? listBuilder.order("score", { ascending: true, nullsFirst: true })
          : listBuilder.order("created_at", { ascending: false });

  const { data, error } = await listBuilder.range(from, to);
  if (error) {
    console.error("listOwnedRuns list failed:", error.message);
    return { runs: [], total, counts };
  }

  return { runs: (data ?? []) as RunListItem[], total, counts };
}
