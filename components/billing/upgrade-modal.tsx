"use client";

import { Modal } from "@/components/modal";
import { PlanPicker } from "@/components/billing/plan-picker";
import type { BillingInterval } from "@/lib/plans";
import type { Plan } from "@/lib/usage";

export function UpgradeModal({
  open,
  onClose,
  currentPlan,
  highlightPlan,
  initialInterval = "month",
}: {
  open: boolean;
  onClose: () => void;
  currentPlan: Plan;
  highlightPlan?: Plan;
  initialInterval?: BillingInterval;
}) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-5xl">
      <div className="max-h-[85vh] overflow-y-auto p-6 pt-12 sm:p-8 sm:pt-12">
        <div className="mb-6">
          <h2 className="text-xl font-semibold tracking-tight">Upgrade your plan</h2>
          <p className="mt-1 text-sm text-muted">
            More credits each month for AI detection, plagiarism, and fact checks.
          </p>
        </div>
        <PlanPicker
          currentPlan={currentPlan}
          highlightPlan={highlightPlan}
          initialInterval={initialInterval}
        />
      </div>
    </Modal>
  );
}
