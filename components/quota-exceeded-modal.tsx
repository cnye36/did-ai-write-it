"use client";

import Link from "next/link";
import { LightningIcon } from "@phosphor-icons/react";
import { Modal } from "@/components/modal";

export function QuotaExceededModal({
  open,
  onClose,
  plan,
  limit,
}: {
  open: boolean;
  onClose: () => void;
  plan: string;
  limit: number;
}) {
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <Modal open={open} onClose={onClose}>
      <div className="mx-auto max-w-sm px-6 py-10 text-center sm:px-8">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <LightningIcon size={22} weight="fill" />
        </span>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">Out of credits</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          You&apos;ve used all {limit.toLocaleString()} credits on the {planName} plan this month.
          Upgrade for a bigger monthly allowance and keep checking without interruption.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <Link
            href="/app/billing"
            onClick={onClose}
            className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
          >
            View plans
          </Link>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            Maybe later
          </button>
        </div>
      </div>
    </Modal>
  );
}
