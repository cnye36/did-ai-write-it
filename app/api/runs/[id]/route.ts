import { errorResponse } from "@/lib/api-errors";
import { requireUser } from "@/lib/supabase/auth";
import type { RunRow } from "@/lib/runs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Fetch a single saved run for the signed-in owner. */
export async function GET(_req: Request, context: RouteContext) {
  try {
    const { supabase, userId } = await requireUser();
    const { id } = await context.params;

    const { data, error } = await supabase
      .from("runs")
      .select("id, kind, title, input_text, word_count, score, result, created_at")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Failed to load run:", error.message);
      return Response.json({ error: "Could not load report." }, { status: 500 });
    }
    if (!data) {
      return Response.json({ error: "Report not found." }, { status: 404 });
    }

    return Response.json({ run: data as RunRow });
  } catch (err) {
    return errorResponse(err);
  }
}
