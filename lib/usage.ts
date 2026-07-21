export type Plan = "free" | "pro" | "studio";

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 500,
  pro: 50_000,
  studio: 200_000,
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
