import type { FeedbackKind } from "@/lib/feedback";

/**
 * Notifies ADMIN_EMAIL by email (via Resend's REST API). Best-effort only:
 * a missing key or a failed send is logged, never thrown, since a
 * notification failure shouldn't surface as a user-facing error anywhere
 * (nothing else depends on this succeeding).
 */
const RESEND_API_URL = "https://api.resend.com/emails";

async function sendAdminEmail(subject: string, text: string, logLabel: string): Promise<void> {
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
      body: JSON.stringify({ from, to, subject, text }),
    });
    if (!res.ok) {
      console.error(`Resend ${logLabel} notification failed:`, res.status, await res.text());
    }
  } catch (err) {
    console.error(`Resend ${logLabel} notification failed:`, err);
  }
}

/** Called from /api/admin/notify-signup, which Supabase's Database Webhooks
 *  hits on every insert into public.verified_signups (see that route for the
 *  full trigger chain). */
export async function sendSignupNotification(email: string): Promise<void> {
  await sendAdminEmail("New signup", `${email} just verified their account.`, "signup");
}

/** Called from /api/feedback right after a bug report or feedback message is saved. */
export async function sendFeedbackNotification(opts: {
  email: string | undefined;
  kind: FeedbackKind;
  message: string;
  pageUrl?: string;
}): Promise<void> {
  const label = opts.kind === "bug" ? "Bug report" : "Feedback";
  const from = opts.email ?? "unknown user";
  const page = opts.pageUrl ? `\nPage: ${opts.pageUrl}` : "";
  await sendAdminEmail(
    `${label} from ${from}`,
    `${opts.message}${page}`,
    "feedback"
  );
}
