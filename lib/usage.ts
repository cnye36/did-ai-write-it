import { QuotaExceededError } from "./api-errors";

export type Plan = "free" | "lite" | "pro" | "studio";

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 2_000,
  lite: 40_000,
  pro: 150_000,
  studio: 500_000,
};

export function remainingWords(plan: Plan, wordsUsed: number): number {
  return Math.max(0, PLAN_LIMITS[plan] - wordsUsed);
}

/**
 * Plagiarism and fact-check cost Winston 2 credits/word, double AI detection's
 * 1 credit/word (per docs.gowinston.ai). Charging the same multiplier against
 * the monthly quota keeps a single shared word pool (no separate plan-gating)
 * while still reflecting the real cost difference, so heavy add-on usage
 * draws down a user's quota proportionally to what it actually costs us.
 */
export const PLAGIARISM_WORD_MULTIPLIER = 2;
export const FACT_CHECK_WORD_MULTIPLIER = 2;

/**
 * Shared quota gate for humanize and detect requests, both of which draw from
 * the same monthly words_used pool. Throws QuotaExceededError; no-op for the
 * DEV_BYPASS_EMAIL account. There is no per-request word cap; requests are
 * bounded only by each route's own MAX_CHARS.
 */
export function assertWithinQuota(
  plan: Plan,
  wordsUsed: number,
  requestedWords: number,
  bypass: boolean
): void {
  if (bypass) return;
  const remaining = remainingWords(plan, wordsUsed);
  if (requestedWords > remaining) {
    throw new QuotaExceededError(plan, PLAN_LIMITS[plan]);
  }
}

/** True if a stored `usage.period_start` (a "YYYY-MM-DD" date) falls in the current UTC month. */
export function isCurrentPeriod(periodStart: string, now = new Date()): boolean {
  const start = new Date(periodStart);
  return (
    start.getUTCFullYear() === now.getUTCFullYear() && start.getUTCMonth() === now.getUTCMonth()
  );
}

/** True if the signed-in email matches DEV_BYPASS_EMAIL, exempting it from quota checks. */
export function isDevBypass(email: string | undefined | null): boolean {
  const bypassEmail = process.env.DEV_BYPASS_EMAIL;
  if (!bypassEmail || !email) return false;
  return email.toLowerCase() === bypassEmail.toLowerCase();
}
