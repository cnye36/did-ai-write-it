/**
 * Marketing-email preference helpers.
 *
 * Source of truth: public.profiles.marketing_emails (default false).
 * Email/password signup seeds it from auth user metadata once at insert.
 * Google signup stashes intent in a short-lived cookie that /auth/callback
 * applies after the OAuth session exists.
 */

export const MARKETING_EMAILS_COOKIE = "daw_mkt";
export const MARKETING_EMAILS_COOKIE_MAX_AGE_SEC = 10 * 60;

/** Set before Google OAuth from the signup page only. Login must not set this. */
export function setMarketingEmailsIntentCookie(enabled: boolean): void {
  document.cookie = [
    `${MARKETING_EMAILS_COOKIE}=${enabled ? "1" : "0"}`,
    "Path=/",
    `Max-Age=${MARKETING_EMAILS_COOKIE_MAX_AGE_SEC}`,
    "SameSite=Lax",
  ].join("; ");
}

export function clearMarketingEmailsIntentCookie(): void {
  document.cookie = `${MARKETING_EMAILS_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}
