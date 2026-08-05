import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { wordsUsedInCurrentPeriod, type Plan } from "@/lib/usage";
import { PLAN_ORDER, type BillingInterval } from "@/lib/plans";
import { applyCheckoutSession, syncProfileFromStripe } from "@/lib/stripe-sync";
import { BillingSummary } from "@/components/billing/billing-summary";
import { MarketingEmailsToggle } from "@/components/billing/marketing-emails-toggle";
import { PricingFaq } from "@/components/billing/pricing-faq";

function isPlan(value: string | undefined): value is Plan {
  return !!value && (PLAN_ORDER as string[]).includes(value);
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    canceled?: string;
    session_id?: string;
    plan?: string;
    interval?: string;
    upgrade?: string;
  }>;
}) {
  const {
    success,
    canceled,
    session_id: sessionId,
    plan: highlightPlanParam,
    interval,
    upgrade,
  } = await searchParams;
  const initialInterval: BillingInterval = interval === "year" ? "year" : "month";
  const highlightPlan = isPlan(highlightPlanParam) ? highlightPlanParam : undefined;
  const initialUpgradeOpen = upgrade === "1" || Boolean(highlightPlan);

  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  const email = data?.claims?.email as string | undefined;
  if (!userId) redirect("/login");

  // Apply the Checkout Session on return so the plan flips immediately —
  // local sandbox often never receives the webhook without `stripe listen`.
  if (sessionId) {
    try {
      const applied = await applyCheckoutSession(userId, sessionId);
      if (applied) redirect("/app/billing?success=1");
    } catch {
      // Fall through to customer/email sync below.
    }
  }

  try {
    await syncProfileFromStripe(userId, email);
  } catch {
    // Keep the DB snapshot if Stripe is unreachable.
  }

  const [{ data: profile }, { data: usage }] = await Promise.all([
    supabase
      .from("profiles")
      .select("plan, stripe_customer_id, stripe_subscription_id, marketing_emails")
      .eq("id", userId)
      .single(),
    supabase.from("usage").select("words_used, period_start").eq("user_id", userId).single(),
  ]);

  const plan = (profile?.plan as Plan | undefined) ?? "free";
  const wordsUsed = wordsUsedInCurrentPeriod(usage?.period_start, usage?.words_used);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          Your plan, credit usage, and subscription settings.
        </p>
      </div>

      {success && (
        <p className="rounded-[10px] bg-good-soft px-4 py-3 text-sm text-good">
          You&apos;re on the {plan.charAt(0).toUpperCase() + plan.slice(1)} plan. Your
          credits are updated.
        </p>
      )}
      {canceled && (
        <p className="rounded-[10px] bg-warn-soft px-4 py-3 text-sm text-warn">
          Checkout canceled. No changes were made.
        </p>
      )}

      <BillingSummary
        plan={plan}
        wordsUsed={wordsUsed}
        periodStart={usage?.period_start ?? null}
        hasStripeCustomer={Boolean(profile?.stripe_customer_id)}
        hasSubscription={Boolean(profile?.stripe_subscription_id)}
        highlightPlan={highlightPlan}
        initialInterval={initialInterval}
        initialUpgradeOpen={initialUpgradeOpen && !success}
      />

      <MarketingEmailsToggle initialEnabled={Boolean(profile?.marketing_emails)} />

      <div className="border-t border-line pt-8">
        <PricingFaq />
      </div>
    </div>
  );
}
