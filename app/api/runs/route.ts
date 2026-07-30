import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { requireUser } from "@/lib/supabase/auth";
import type { RunListItem } from "@/lib/runs";

/** List the signed-in user's recent runs (sidebar). */
export async function GET() {
  try {
    const { supabase, userId } = await requireUser();

    const { data, error } = await supabase
      .from("runs")
      .select("id, kind, title, word_count, score, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("Failed to list runs:", error.message);
      return Response.json({ error: "Could not load reports." }, { status: 500 });
    }

    return Response.json({ runs: (data ?? []) as RunListItem[] });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, userId } = await requireUser();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) {
      return Response.json({ error: "Missing report id." }, { status: 400 });
    }

    const { error } = await supabase.from("runs").delete().eq("id", id).eq("user_id", userId);
    if (error) {
      console.error("Failed to delete run:", error.message);
      return Response.json({ error: "Could not delete report." }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
