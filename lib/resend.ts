/**
 * Notifies ADMIN_EMAIL by email (via Resend's REST API) when a user finishes
 * signup (confirmed email, or Google/OAuth). Called from
 * /api/admin/notify-signup, which Supabase's Database Webhooks hits on every
 * insert into public.verified_signups (see that route for the full trigger
 * chain). Best-effort only: a missing key or a failed send is logged, never
 * thrown, since a notification failure shouldn't surface as a user-facing
 * error anywhere (nothing else depends on this succeeding).
 */
const RESEND_API_URL = "https://api.resend.com/emails";

export async function sendSignupNotification(email: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ADMIN_EMAIL;
  if (!apiKey || !to) return;

  const from = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

  try {
    const res = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to,
        subject: `New signup: ${email}`,
        text: `${email} just verified their account.`,
      }),
    });
    if (!res.ok) {
      console.error("Resend signup notification failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("Resend signup notification failed:", err);
  }
}
