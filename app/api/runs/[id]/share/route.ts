import { errorResponse } from "@/lib/api-errors";
import { requireUser } from "@/lib/supabase/auth";

interface RouteContext {
  params: Promise<{ id: string }>;
}

/** Current share status for a run the signed-in user owns. */
export async function GET(_req: Request, context: RouteContext) {
  try {
    const { supabase, userId } = await requireUser();
    const { id } = await context.params;

    const { data, error } = await supabase
      .from("runs")
      .select("share_token")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      console.error("Failed to load share status:", error.message);
      return Response.json({ error: "Could not load share status." }, { status: 500 });
    }
    if (!data) {
      return Response.json({ error: "Report not found." }, { status: 404 });
    }

    return Response.json({ shareToken: (data.share_token as string | null) ?? null });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Turns on sharing for a run, or returns the existing token if already shared. */
export async function POST(_req: Request, context: RouteContext) {
  try {
    const { supabase, userId } = await requireUser();
    const { id } = await context.params;

    const { data: existing, error: fetchError } = await supabase
      .from("runs")
      .select("share_token")
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    if (fetchError) {
      console.error("Failed to load report before sharing:", fetchError.message);
      return Response.json({ error: "Could not create share link." }, { status: 500 });
    }
    if (!existing) {
      return Response.json({ error: "Report not found." }, { status: 404 });
    }
    if (existing.share_token) {
      return Response.json({ shareToken: existing.share_token as string });
    }

    const shareToken = crypto.randomUUID();
    const { error: updateError } = await supabase
      .from("runs")
      .update({ share_token: shareToken })
      .eq("id", id)
      .eq("user_id", userId);

    if (updateError) {
      console.error("Failed to create share link:", updateError.message);
      return Response.json({ error: "Could not create share link." }, { status: 500 });
    }

    return Response.json({ shareToken });
  } catch (err) {
    return errorResponse(err);
  }
}

/** Turns off sharing for a run. */
export async function DELETE(_req: Request, context: RouteContext) {
  try {
    const { supabase, userId } = await requireUser();
    const { id } = await context.params;

    const { error } = await supabase
      .from("runs")
      .update({ share_token: null })
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to revoke share link:", error.message);
      return Response.json({ error: "Could not turn off sharing." }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    return errorResponse(err);
  }
}
