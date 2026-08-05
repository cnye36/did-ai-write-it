import type Stripe from "stripe";
import { PLAN_ORDER, type BillingInterval } from "@/lib/plans";
import { sendUpgradeNotification } from "@/lib/resend";
import { getStripe, planForPriceId, priceIdForPlan, type PaidPlan } from "@/lib/stripe";
import { createServiceClient } from "@/lib/supabase/service";
import { utcToday, type Plan } from "@/lib/usage";

/** Entitled to paid plan limits. past_due is intentionally excluded so failed
 *  payments fall back to free until Stripe returns the sub to active/trialing. */
const PAID_STATUSES = new Set(["active", "trialing"]);

/** Failed / blocked collection: keep the subscription id for portal + retries,
 *  but do not grant paid credits. */
const UNPAID_RETAIN_STATUSES = new Set(["past_due", "unpaid"]);

const TERMINAL_STATUSES = new Set([
  "canceled",
  "incomplete_expired",
  "paused",
]);

function planFromSubscription(subscription: Stripe.Subscription): PaidPlan | null {
  const priceId = subscription.items.data[0]?.price.id;
  return priceId ? planForPriceId(priceId) : null;
}

function planRank(plan: Plan): number {
  return PLAN_ORDER.indexOf(plan);
}

function isPaidStatus(status: string): boolean {
  return PAID_STATUSES.has(status);
}

/** Best-effort admin email when the plan ladder moves up. Never throws. */
async function notifyIfUpgrade(
  email: string | null | undefined,
  fromPlan: Plan | null | undefined,
  toPlan: Plan
): Promise<void> {
  if (!email || !fromPlan) return;
  if (planRank(toPlan) <= planRank(fromPlan)) return;
  await sendUpgradeNotification({ email, fromPlan, toPlan });
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
    .select("plan, email, stripe_subscription_id")
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

  if (planChanged) {
    await notifyIfUpgrade(existing?.email, existing?.plan as Plan | undefined, fields.plan);
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
    .select("id, plan, email")
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

  if (planChanged) {
    await notifyIfUpgrade(existing?.email, existing?.plan as Plan | undefined, fields.plan);
  }
}

async function resolvePlanFromSubscriptionId(
  subscriptionId: string
): Promise<PaidPlan | null> {
  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (!isPaidStatus(subscription.status)) return null;
  return planFromSubscription(subscription);
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
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription"],
  });

  if (session.mode !== "subscription" || session.status !== "complete") return null;
  // Card Checkout is paid immediately. Skip unpaid/async sessions until a
  // later payment event (or subscription.updated) confirms entitlement.
  if (session.payment_status && session.payment_status !== "paid") return null;

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
  if (!subscriptionId) return null;

  // Price ID is authority; metadata.plan is only a hint if the Price map fails.
  let plan = await resolvePlanFromSubscriptionId(subscriptionId);
  if (!plan) {
    const metaPlan = session.metadata?.plan as PaidPlan | undefined;
    if (metaPlan && ["lite", "plus", "pro"].includes(metaPlan)) {
      // Subscription may still be incomplete right after Checkout; only trust
      // metadata when payment_status is already paid (checked above).
      plan = metaPlan;
    }
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
 * Switch an existing subscriber to a different Price (plan and/or interval)
 * without opening a second Checkout Session. Applies the profile update
 * immediately; the subscription.updated webhook will reaffirm the same state.
 */
export async function changeExistingSubscription(
  userId: string,
  plan: PaidPlan,
  interval: BillingInterval
): Promise<Plan> {
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_subscription_id, stripe_customer_id, plan")
    .eq("id", userId)
    .single();

  if (!profile?.stripe_subscription_id) {
    throw new Error("No active subscription to change. Start checkout instead.");
  }

  const stripe = getStripe();
  const subscription = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
  if (
    !isPaidStatus(subscription.status) &&
    !UNPAID_RETAIN_STATUSES.has(subscription.status)
  ) {
    throw new Error("No active subscription to change. Start checkout instead.");
  }

  const itemId = subscription.items.data[0]?.id;
  if (!itemId) {
    throw new Error("Subscription has no price item to update.");
  }

  const newPriceId = priceIdForPlan(plan, interval);
  const currentPriceId = subscription.items.data[0]?.price.id;
  if (currentPriceId === newPriceId) {
    return plan;
  }

  const updated = await stripe.subscriptions.update(subscription.id, {
    items: [{ id: itemId, price: newPriceId }],
    proration_behavior: "create_prorations",
    metadata: {
      ...subscription.metadata,
      supabase_user_id: userId,
      plan,
    },
  });

  await applySubscriptionObject(updated);
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
    .select("stripe_customer_id, stripe_subscription_id, plan")
    .eq("id", userId)
    .single();

  const stripe = getStripe();
  let customerId = profile?.stripe_customer_id ?? null;

  if (!customerId && email) {
    const customers = await stripe.customers.list({ email, limit: 2 });
    // Ambiguous matches must not silently attach the wrong customer.
    if (customers.data.length === 1) {
      customerId = customers.data[0].id;
      const { error } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
      if (error) throw new Error(`Failed to attach Stripe customer: ${error.message}`);
    }
  }

  if (!customerId) return null;

  let paid: Stripe.Subscription | null = null;
  let unpaidRetainId: string | null = null;
  let retrieveFailed = false;
  let knownIncomplete = false;

  if (profile?.stripe_subscription_id) {
    try {
      const known = await stripe.subscriptions.retrieve(profile.stripe_subscription_id);
      if (isPaidStatus(known.status)) {
        paid = known;
      } else if (UNPAID_RETAIN_STATUSES.has(known.status)) {
        unpaidRetainId = known.id;
      } else if (known.status === "incomplete") {
        // Checkout can briefly report incomplete while payment_status is paid.
        // Do not wipe a plan that applyCheckoutSession just wrote.
        knownIncomplete = true;
      }
    } catch {
      retrieveFailed = true;
    }
  }

  if (!paid) {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "all",
      limit: 10,
    });
    paid = subscriptions.data.find((sub) => isPaidStatus(sub.status)) ?? null;
    if (!paid && !unpaidRetainId) {
      const retain = subscriptions.data.find((sub) =>
        UNPAID_RETAIN_STATUSES.has(sub.status)
      );
      unpaidRetainId = retain?.id ?? null;
    }
    if (!paid && !unpaidRetainId && !knownIncomplete) {
      knownIncomplete = subscriptions.data.some((sub) => sub.status === "incomplete");
    }
  }

  if (paid) {
    const plan = planFromSubscription(paid);
    if (!plan) return null;
    await updateProfileByUserId(userId, {
      plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: paid.id,
    });
    return plan;
  }

  if (unpaidRetainId) {
    await updateProfileByUserId(userId, {
      plan: "free",
      stripe_customer_id: customerId,
      stripe_subscription_id: unpaidRetainId,
    });
    return "free";
  }

  if (
    (retrieveFailed || knownIncomplete) &&
    profile?.plan &&
    profile.plan !== "free"
  ) {
    // Network blip, or Checkout still settling: keep the DB snapshot.
    return profile.plan as Plan;
  }

  await updateProfileByUserId(userId, {
    plan: "free",
    stripe_customer_id: customerId,
    stripe_subscription_id: null,
  });
  return "free";
}

/** Webhook helper: checkout.session.completed */
export async function applyCheckoutSessionObject(
  session: Stripe.Checkout.Session
): Promise<void> {
  if (session.mode !== "subscription" || session.status !== "complete") return;
  if (session.payment_status && session.payment_status !== "paid") return;

  const userId = session.client_reference_id ?? session.metadata?.supabase_user_id;
  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id ?? null;

  if (!userId || !customerId || !subscriptionId) return;

  let plan = await resolvePlanFromSubscriptionId(subscriptionId);
  if (!plan) {
    const metaPlan = session.metadata?.plan as PaidPlan | undefined;
    if (metaPlan && ["lite", "plus", "pro"].includes(metaPlan)) {
      plan = metaPlan;
    }
  }
  if (!plan) return;

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

  if (deleted || TERMINAL_STATUSES.has(subscription.status)) {
    await updateProfileByCustomerId(customerId, {
      plan: "free",
      stripe_subscription_id: null,
    });
    return;
  }

  if (subscription.status === "incomplete") {
    // Let checkout.session.completed (payment_status paid) own activation.
    // Avoid racing a just-granted plan back to free.
    return;
  }

  if (UNPAID_RETAIN_STATUSES.has(subscription.status)) {
    await updateProfileByCustomerId(customerId, {
      plan: "free",
      stripe_subscription_id: subscription.id,
    });
    return;
  }

  if (!isPaidStatus(subscription.status)) {
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
