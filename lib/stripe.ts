import Stripe from "stripe";
import { MissingKeyError } from "@/lib/api-errors";
import type { BillingInterval } from "@/lib/plans";
import type { Plan } from "@/lib/usage";

export type PaidPlan = Exclude<Plan, "free">;

let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new MissingKeyError("STRIPE_SECRET_KEY");
    client = new Stripe(key);
  }
  return client;
}

const PLAN_PRICE_IDS: Record<PaidPlan, Record<BillingInterval, string | undefined>> = {
  lite: { month: process.env.STRIPE_PRICE_LITE_MONTHLY, year: process.env.STRIPE_PRICE_LITE_ANNUAL },
  pro: { month: process.env.STRIPE_PRICE_PRO_MONTHLY, year: process.env.STRIPE_PRICE_PRO_ANNUAL },
  studio: {
    month: process.env.STRIPE_PRICE_STUDIO_MONTHLY,
    year: process.env.STRIPE_PRICE_STUDIO_ANNUAL,
  },
};

export function priceIdForPlan(plan: PaidPlan, interval: BillingInterval): string {
  const id = PLAN_PRICE_IDS[plan][interval];
  if (!id) {
    const suffix = interval === "year" ? "ANNUAL" : "MONTHLY";
    throw new MissingKeyError(`STRIPE_PRICE_${plan.toUpperCase()}_${suffix}`);
  }
  return id;
}

export function planForPriceId(priceId: string): PaidPlan | null {
  for (const [plan, intervals] of Object.entries(PLAN_PRICE_IDS) as [
    PaidPlan,
    Record<BillingInterval, string | undefined>,
  ][]) {
    if (intervals.month === priceId || intervals.year === priceId) return plan;
  }
  return null;
}
