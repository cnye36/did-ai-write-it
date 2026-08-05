import { NextRequest } from "next/server";
import { errorResponse } from "@/lib/api-errors";
import { requireUser } from "@/lib/supabase/auth";
import { getStripe, priceIdForPlan, type PaidPlan } from "@/lib/stripe";
import { changeExistingSubscription } from "@/lib/stripe-sync";
import type { BillingInterval } from "@/lib/plans";

const CHECKOUT_PLANS: PaidPlan[] = ["lite", "plus", "pro"];
const INTERVALS: BillingInterval[] = ["month", "year"];

export async function POST(req: NextRequest) {
  try {
    const { supabase, userId, email } = await requireUser();
    const { plan, interval } = (await req.json()) as {
      plan?: string;
      interval?: string;
    };
    if (!plan || !CHECKOUT_PLANS.includes(plan as PaidPlan)) {
      return Response.json({ error: "Choose a plan to upgrade to." }, { status: 400 });
    }
    const billingInterval: BillingInterval = INTERVALS.includes(interval as BillingInterval)
      ? (interval as BillingInterval)
      : "month";

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, stripe_subscription_id, plan")
      .eq("id", userId)
      .single();

    // Existing subscribers must update the current subscription in place.
    // Opening a second Checkout Session would create a second live bill.
    // Includes past_due (plan may already be free) so retries don't stack subs.
    if (profile?.stripe_subscription_id) {
      try {
        const nextPlan = await changeExistingSubscription(
          userId,
          plan as PaidPlan,
          billingInterval
        );
        return Response.json({ changed: true, plan: nextPlan });
      } catch (err) {
        // Stale/canceled subscription id: fall through to a fresh Checkout.
        console.warn(
          "changeExistingSubscription failed; falling back to Checkout:",
          err instanceof Error ? err.message : err
        );
      }
    }

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceIdForPlan(plan as PaidPlan, billingInterval), quantity: 1 }],
      ...(profile?.stripe_customer_id
        ? { customer: profile.stripe_customer_id }
        : { customer_email: email }),
      client_reference_id: userId,
      metadata: { supabase_user_id: userId, plan },
      subscription_data: {
        metadata: { supabase_user_id: userId, plan },
      },
      success_url: `${req.nextUrl.origin}/app/billing?success=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${req.nextUrl.origin}/app/billing?canceled=1`,
    });

    return Response.json({ url: session.url });
  } catch (err) {
    return errorResponse(err);
  }
}
