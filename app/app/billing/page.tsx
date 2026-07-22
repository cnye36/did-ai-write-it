import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isCurrentPeriod, PLAN_LIMITS, type Plan } from "@/lib/usage";
import type { BillingInterval } from "@/lib/plans";
import { PlanPicker } from "@/components/billing/plan-picker";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    success?: string;
    canceled?: string;
    plan?: string;
    interval?: string;
  }>;
}) {
  const { success, canceled, plan: highlightPlan, interval } = await searchParams;
  const initialInterval: BillingInterval = interval === "year" ? "year" : "month";
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) redirect("/login");

  const [{ data: profile }, { data: usage }] = await Promise.all([
    supabase.from("profiles").select("plan, stripe_customer_id").eq("id", userId).single(),
    supabase.from("usage").select("words_used, period_start").eq("user_id", userId).single(),
  ]);
  const plan = (profile?.plan as Plan | undefined) ?? "free";
  const wordsUsed = usage && isCurrentPeriod(usage.period_start) ? usage.words_used : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Billing</h1>
        <p className="mt-1 text-sm text-muted">
          {wordsUsed.toLocaleString()} / {PLAN_LIMITS[plan].toLocaleString()} words used this
          month on the {plan} plan.
        </p>
      </div>

      {success && (
        <p className="rounded-[10px] bg-good-soft px-4 py-3 text-sm text-good">
          Subscription updated. It may take a moment to reflect below.
        </p>
      )}
      {canceled && (
        <p className="rounded-[10px] bg-warn-soft px-4 py-3 text-sm text-warn">
          Checkout canceled. No changes were made.
        </p>
      )}

      {profile?.stripe_customer_id && <ManageSubscriptionButton />}

      <PlanPicker
        currentPlan={plan}
        highlightPlan={highlightPlan as Plan | undefined}
        initialInterval={initialInterval}
      />
    </div>
  );
}
