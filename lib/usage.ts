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
