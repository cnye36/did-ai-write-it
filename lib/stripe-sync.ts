import type Stripe from "stripe";
import { getStripe, planForPriceId, type PaidPlan } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { utcToday, type Plan } from "@/lib/usage";

const ACTIVE_STATUSES = new Set(["active", "trialing", "past_due"]);

function planFromSubscription(subscription: Stripe.Subscription): PaidPlan | null {
  const priceId = subscription.items.data[0]?.price.id;
  return priceId ? planForPriceId(priceId) : null;
}

/** Start a fresh credit cycle for this user (words_used = 0, period_start = today). */
async function resetUsagePeriod(userId: string): Promise<void> {
  const supabase = createServiceClient();
  const { error } = await supabase
    .from("usage")
    .update({ words_used: 0, period_start: utcToday() })
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to reset usage: ${error.message}`);
}

/**
 * Write plan + Stripe IDs onto a profile. Uses the service role (no user UPDATE
 * RLS). When the plan actually changes, starts a fresh credit cycle so free-tier
 * usage (or the previous plan's usage) does not carry into the new allowance.
 */
async function updateProfileByUserId(
  userId: string,
  fields: {
    plan: Plan;
    stripe_customer_id?: string;
    stripe_subscription_id: string | null;
  },
  opts: { resetUsage?: boolean } = {}
): Promise<void> {
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("plan, stripe_subscription_id")
    .eq("id", userId)
    .single();

  const { error } = await supabase.from("profiles").update(fields).eq("id", userId);
  if (error) throw new Error(`Failed to update profile: ${error.message}`);

  const planChanged = existing?.plan !== fields.plan;
  const subscriptionChanged =
    Boolean(fields.stripe_subscription_id) &&
    existing?.stripe_subscription_id !== fields.stripe_subscription_id;
  if ((opts.resetUsage && subscriptionChanged) || planChanged) {
    await resetUsagePeriod(userId);
  }
}

async function updateProfileByCustomerId(
  customerId: string,
  fields: {
    plan: Plan;
    stripe_subscription_id: string | null;
  },
  opts: { resetUsage?: boolean } = {}
): Promise<void> {
  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from("profiles")
    .select("id, plan")
    .eq("stripe_customer_id", customerId)
    .single();

  const { error } = await supabase
    .from("profiles")
    .update(fields)
    .eq("stripe_customer_id", customerId);
  if (error) throw new Error(`Failed to update profile: ${error.message}`);

  const planChanged = existing?.plan !== fields.plan;
  if ((opts.resetUsage || planChanged) && existing?.id) {
    await resetUsagePeriod(existing.id);
  }
}

/**
 * Apply a completed Checkout Session to the signed-in user's profile.
 * Used when the user lands back on /app/billing with ?session_id=… so the
 * plan updates immediately without waiting on the webhook (which often never
 * reaches localhost unless `stripe listen` is running).
 */
export async function applyCheckoutSession(
  userId: string,
  sessionId: string
): Promise<Plan | null> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.retrieve(sessionId);

  if (session.mode !== "subscription" || session.status !== "complete") return null;

  const sessionUser =
    session.client_reference_id ?? session.metadata?.supabase_user_id ?? null;
  if (!sessionUser || sessionUser !== userId) return null;

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  if (!customerId) return null;

  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  let plan = (session.metadata?.plan as PaidPlan | undefined) ?? null;
  if (!plan && subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    plan = planFromSubscription(subscription);
  }
  if (!plan) return null;

  // A new subscription starts a fresh credit cycle. Replaying the same
  // checkout session or webhook must not reset usage again.
  await updateProfileByUserId(
    userId,
    {
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    },
    { resetUsage: true }
  );

  return plan;
}

/**
 * Pull the customer's current subscription from Stripe and mirror it onto the
 * profile. Call on /app/billing load so portal cancels/upgrades (and any
 * checkout whose webhook never arrived) show up immediately.
 *
 * If the profile has no `stripe_customer_id` yet, looks the customer up by
 * email — that heals local sandbox upgrades where Checkout completed but the
 * webhook never reached localhost.
 */
export async function syncProfileFromStripe(
  userId: string,
  email?: string | null
): Promise<Plan | null> {
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .single();

  const stripe = getStripe();
  let customerId = profile?.stripe_customer_id ?? null;

  if (!customerId && email) {
    const customers = await stripe.customers.list({ email, limit: 1 });
    customerId = customers.data[0]?.id ?? null;
    if (customerId) {
      const { error } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
      if (error) throw new Error(`Failed to attach Stripe customer: ${error.message}`);
    }
  }

  if (!customerId) return null;

  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 10,
  });

  const current = subscriptions.data.find((sub) => ACTIVE_STATUSES.has(sub.status));
  if (!current) {
    await updateProfileByUserId(userId, {
      plan: "free",
      stripe_customer_id: customerId,
      stripe_subscription_id: null,
    });
    return "free";
  }

  const plan = planFromSubscription(current);
  if (!plan) return null;

  await updateProfileByUserId(userId, {
    plan,
    stripe_customer_id: customerId,
    stripe_subscription_id: current.id,
  });
  return plan;
}

/** Webhook helper: checkout.session.completed */
export async function applyCheckoutSessionObject(
  session: Stripe.Checkout.Session
): Promise<void> {
  const userId = session.client_reference_id ?? session.metadata?.supabase_user_id;
  const plan = session.metadata?.plan as Plan | undefined;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!userId || !plan || !customerId) return;

  await updateProfileByUserId(
    userId,
    {
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
    },
    { resetUsage: true }
  );
}

/** Webhook helper: customer.subscription.updated / deleted */
export async function applySubscriptionObject(
  subscription: Stripe.Subscription,
  deleted = false
): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer.id;

  if (deleted || !ACTIVE_STATUSES.has(subscription.status)) {
    await updateProfileByCustomerId(customerId, {
      plan: "free",
      stripe_subscription_id: null,
    });
    return;
  }

  const plan = planFromSubscription(subscription);
  if (!plan) return;

  await updateProfileByCustomerId(customerId, {
    plan,
    stripe_subscription_id: subscription.id,
  });
}
