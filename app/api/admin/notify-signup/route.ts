import { NextRequest } from "next/server";
import { sendSignupNotification } from "@/lib/resend";

/**
 * Hit by a Supabase Database Webhook (Database -> Webhooks in the dashboard,
 * not something this repo can configure from a migration without committing
 * the secret to git): table `profiles`, event INSERT, HTTP header
 * `x-webhook-secret` set to SUPABASE_WEBHOOK_SECRET. profiles is the trigger
 * point (not auth.users directly) since a row lands there immediately on
 * signup regardless of whether email confirmation is required.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.SUPABASE_WEBHOOK_SECRET;
  if (!secret || req.headers.get("x-webhook-secret") !== secret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const payload = await req.json();
  const email = payload?.record?.email as string | undefined;
  if (email) {
    await sendSignupNotification(email);
  }

  return Response.json({ received: true });
}
