import { PLAN_LIMITS, type Plan } from "@/lib/usage";

export type BillingInterval = "month" | "year";

export interface PlanInfo {
  plan: Plan;
  name: string;
  /** List price when billed monthly. */
  priceMonthly: number;
  /** Effective monthly rate when billed annually (50% off). Always shown as /mo. */
  priceAnnualMonthly: number;
  features: string[];
}

export const PLAN_ORDER: Plan[] = ["free", "lite", "pro", "studio"];

/** Annual billing is half the monthly list price. */
export const ANNUAL_DISCOUNT_PERCENT = 50;

/** Display price for a plan at a given billing interval (always a monthly rate). */
export function priceForInterval(plan: Plan, interval: BillingInterval): number {
  const info = PLAN_INFO[plan];
  if (info.priceMonthly === 0) return 0;
  return interval === "year" ? info.priceAnnualMonthly : info.priceMonthly;
}

/** Format a plan price for UI ($2.5 → "2.50", $24 → "24"). */
export function formatPlanPrice(price: number): string {
  return Number.isInteger(price) ? String(price) : price.toFixed(2);
}

export const PLAN_INFO: Record<Plan, PlanInfo> = {
  free: {
    plan: "free",
    name: "Free",
    priceMonthly: 0,
    priceAnnualMonthly: 0,
    features: [
      `${PLAN_LIMITS.free.toLocaleString()} words / month`,
      "AI detection, plagiarism & fact checks",
      "Full sentence-by-sentence report",
    ],
  },
  lite: {
    plan: "lite",
    name: "Lite",
    priceMonthly: 9,
    priceAnnualMonthly: 5,
    features: [
      `${PLAN_LIMITS.lite.toLocaleString()} words / month`,
      "AI detection, plagiarism & fact checks",
      "Full sentence-by-sentence report",
    ],
  },
  pro: {
    plan: "pro",
    name: "Pro",
    priceMonthly: 24,
    priceAnnualMonthly: 12,
    features: [
      `${PLAN_LIMITS.pro.toLocaleString()} words / month`,
      "AI detection, plagiarism & fact checks",
      "Priority processing",
    ],
  },
  studio: {
    plan: "studio",
    name: "Studio",
    priceMonthly: 49,
    priceAnnualMonthly: 24,
    features: [
      `${PLAN_LIMITS.studio.toLocaleString()} words / month`,
      "AI detection, plagiarism & fact checks",
      "Priority processing",
    ],
  },
};
