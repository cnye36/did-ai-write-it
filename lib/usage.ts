import { MaxOutputWordsExceededError, QuotaExceededError } from "./api-errors";

export type Plan = "free" | "lite" | "pro" | "studio";

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 500,
  lite: 10_000,
  pro: 30_000,
  studio: 100_000,
};

/** Max words accepted in a single /api/humanize request, independent of the monthly quota. */
export const PLAN_MAX_OUTPUT_WORDS: Record<Plan, number> = {
  free: 300,
  lite: 800,
  pro: 1_500,
  studio: 2_500,
};

export function remainingWords(plan: Plan, wordsUsed: number): number {
  return Math.max(0, PLAN_LIMITS[plan] - wordsUsed);
}

/**
 * Shared quota gate for humanize and detect requests, both of which draw from
 * the same monthly words_used pool. Throws MaxOutputWordsExceededError or
 * QuotaExceededError; no-op for the DEV_BYPASS_EMAIL account.
 */
export function assertWithinQuota(
  plan: Plan,
  wordsUsed: number,
  requestedWords: number,
  bypass: boolean
): void {
  if (bypass) return;
  if (requestedWords > PLAN_MAX_OUTPUT_WORDS[plan]) {
    throw new MaxOutputWordsExceededError(plan, PLAN_MAX_OUTPUT_WORDS[plan]);
  }
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
