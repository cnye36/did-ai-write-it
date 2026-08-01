"use client";

import { useState } from "react";
import {
  ArrowUpRightIcon,
  CheckCircleIcon,
  CoinsIcon,
} from "@phosphor-icons/react";
import { ManageSubscriptionButton } from "@/components/billing/manage-subscription-button";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { PLAN_INFO, type BillingInterval } from "@/lib/plans";
import {
  formatPeriodResetLabel,
  PLAN_LIMITS,
  remainingWords,
  type Plan,
} from "@/lib/usage";

export function BillingSummary({
  plan,
  wordsUsed,
  periodStart,
  hasStripeCustomer,
  hasSubscription,
  highlightPlan,
  initialInterval = "month",
  initialUpgradeOpen = false,
}: {
  plan: Plan;
  wordsUsed: number;
  periodStart: string | null;
  hasStripeCustomer: boolean;
  hasSubscription: boolean;
  highlightPlan?: Plan;
  initialInterval?: BillingInterval;
  initialUpgradeOpen?: boolean;
}) {
  const [upgradeOpen, setUpgradeOpen] = useState(initialUpgradeOpen);
  const info = PLAN_INFO[plan];
  const limit = PLAN_LIMITS[plan];
  const remaining = remainingWords(plan, wordsUsed);
  const usedPct = limit === 0 ? 0 : Math.min(100, Math.round((wordsUsed / limit) * 100));
  const isPaid = plan !== "free";
  const canUpgrade = plan !== "pro";
  const resetLabel = periodStart
    ? formatPeriodResetLabel(periodStart)
    : formatPeriodResetLabel(new Date().toISOString().slice(0, 10));

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* Plan */}
        <section className="rounded-2xl border border-line bg-raised p-6 sm:p-8">
          <p className="text-xs font-medium uppercase tracking-wide text-faint">Current plan</p>
          <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h2 className="text-3xl font-semibold tracking-tight">{info.name}</h2>
            <p className="font-mono text-lg text-muted">
              {info.priceMonthly === 0 ? (
                "Free"
              ) : (
                <>
                  ${info.priceMonthly}
                  <span className="text-sm font-sans font-normal">/mo</span>
                </>
              )}
            </p>
          </div>
          <ul className="mt-5 space-y-2.5">
            {info.features.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm leading-relaxed text-muted">
                <CheckCircleIcon
                  size={18}
                  weight="fill"
                  className="mt-0.5 shrink-0 text-accent"
                />
                {f}
              </li>
            ))}
          </ul>

          <div className="mt-8 flex flex-wrap gap-3">
            {canUpgrade && (
              <button
                type="button"
                onClick={() => setUpgradeOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
              >
                {isPaid ? "Change plan" : "Upgrade"}
                <ArrowUpRightIcon size={14} weight="bold" />
              </button>
            )}
            {hasStripeCustomer && (
              <ManageSubscriptionButton label="Manage billing" flow="manage" />
            )}
          </div>
        </section>

        {/* Credits */}
        <section className="rounded-2xl border border-line bg-raised p-6 sm:p-8">
          <div className="flex items-center gap-2">
            <span className="inline-flex size-8 items-center justify-center rounded-full bg-accent-soft text-accent">
              <CoinsIcon size={16} weight="fill" />
            </span>
            <p className="text-xs font-medium uppercase tracking-wide text-faint">
              Credits this period
            </p>
          </div>

          <p className="mt-4 font-mono text-3xl font-semibold tracking-tight">
            {wordsUsed.toLocaleString()}
            <span className="text-lg font-normal text-muted">
              {" "}
              / {limit.toLocaleString()}
            </span>
          </p>
          <p className="mt-1 text-sm text-muted">
            {remaining.toLocaleString()} credits left · resets {resetLabel} (UTC)
          </p>

          <div
            className="mt-5 h-2 overflow-hidden rounded-full bg-line"
            role="progressbar"
            aria-valuenow={usedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${usedPct}% of period credits used`}
          >
            <div
              className={`h-full rounded-full transition-[width] ${
                usedPct >= 100 ? "bg-bad" : usedPct >= 80 ? "bg-warn" : "bg-accent"
              }`}
              style={{ width: `${usedPct}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-faint">{usedPct}% used</p>

          <div className="mt-6 space-y-3 border-t border-line pt-5 text-sm leading-relaxed text-muted">
            <p>
              One credit ≈ one word of AI detection. Plagiarism and fact checks cost{" "}
              <span className="font-medium text-ink">2 credits per word</span> because they
              search the web.
            </p>
            <p>
              Unused credits do not roll over. Your allowance resets each month on your
              billing anniversary (the day you signed up or changed plans).
            </p>
          </div>
        </section>
      </div>

      {hasSubscription && (
        <section className="rounded-2xl border border-line p-6 sm:p-8">
          <h3 className="text-sm font-semibold tracking-tight">Cancel subscription</h3>
          <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-muted">
            You&apos;ll keep access through the end of your current billing period, then move
            to the Free plan ({PLAN_LIMITS.free.toLocaleString()} credits / month). You can
            resubscribe anytime.
          </p>
          <div className="mt-4">
            <ManageSubscriptionButton
              flow="cancel"
              label="Cancel subscription"
              className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-muted transition-colors hover:border-bad hover:text-bad disabled:cursor-not-allowed disabled:opacity-40"
            />
          </div>
        </section>
      )}

      <UpgradeModal
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        currentPlan={plan}
        highlightPlan={highlightPlan}
        initialInterval={initialInterval}
      />
    </>
  );
}
