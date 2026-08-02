import { NextRequest } from "next/server";
import { sendSignupNotification } from "@/lib/resend";

/**
 * Hit by a Supabase Database Webhook (Database -> Webhooks in the dashboard,
 * not something this repo can configure from a migration without committing
 * the secret to git): table `verified_signups`, event INSERT, HTTP header
 * `x-webhook-secret` set to SUPABASE_WEBHOOK_SECRET.
 *
 * That table is populated by `handle_verified_signup` only when
 * auth.users.email_confirmed_at becomes set (confirmation link click, or
 * Google/OAuth where it is already set on insert). Unconfirmed email
 * signups create a profiles row but never a verified_signups row, so they
 * do not notify.
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
