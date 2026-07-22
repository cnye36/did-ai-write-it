import { PLAN_LIMITS, PLAN_MAX_OUTPUT_WORDS, type Plan } from "@/lib/usage";

export type BillingInterval = "month" | "year";

export interface PlanInfo {
  plan: Plan;
  name: string;
  priceMonthly: number;
  features: string[];
}

export const PLAN_ORDER: Plan[] = ["free", "lite", "pro", "studio"];

/** Annual plans bill for 10 months, so 2 are free. */
export const ANNUAL_MONTHS_FREE = 2;

export function annualPrice(priceMonthly: number): number {
  return priceMonthly * (12 - ANNUAL_MONTHS_FREE);
}

/** Price to display for a plan at a given billing interval. */
export function priceForInterval(priceMonthly: number, interval: BillingInterval): number {
  if (priceMonthly === 0) return 0;
  return interval === "year" ? annualPrice(priceMonthly) : priceMonthly;
}

export const PLAN_INFO: Record<Plan, PlanInfo> = {
  free: {
    plan: "free",
    name: "Free",
    priceMonthly: 0,
    features: [
      "Unlimited AI detection",
      "Full signal breakdown",
      `${PLAN_LIMITS.free.toLocaleString()} humanized words / month`,
      `${PLAN_MAX_OUTPUT_WORDS.free.toLocaleString()} words max per request`,
    ],
  },
  lite: {
    plan: "lite",
    name: "Lite",
    priceMonthly: 9,
    features: [
      `${PLAN_LIMITS.lite.toLocaleString()} humanized words / month`,
      `${PLAN_MAX_OUTPUT_WORDS.lite.toLocaleString()} words max per request`,
      "Rewrites until it reads human",
    ],
  },
  pro: {
    plan: "pro",
    name: "Pro",
    priceMonthly: 19,
    features: [
      `${PLAN_LIMITS.pro.toLocaleString()} humanized words / month`,
      `${PLAN_MAX_OUTPUT_WORDS.pro.toLocaleString()} words max per request`,
      "Priority processing",
    ],
  },
  studio: {
    plan: "studio",
    name: "Studio",
    priceMonthly: 39,
    features: [
      `${PLAN_LIMITS.studio.toLocaleString()} humanized words / month`,
      `${PLAN_MAX_OUTPUT_WORDS.studio.toLocaleString()} words max per request`,
      "Real detector pass reports",
      "API access",
    ],
  },
};
