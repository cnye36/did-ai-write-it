"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { LightningIcon, XIcon } from "@phosphor-icons/react";

function dismissKey(): string {
  return `daw.lowCreditDismissed.${new Date().toISOString().slice(0, 7)}`;
}

const subscribe = () => () => {};

function getServerSnapshot() {
  return false;
}

/** Proactive warning shown once a user is close to their monthly quota, before
 *  a check actually gets blocked by QuotaExceededModal. Dismissal is keyed by
 *  calendar month so it naturally resurfaces after the usage reset instead of
 *  needing period_start threaded down from the layout. */
export function LowCreditBanner({ usedPct }: { usedPct: number }) {
  const [dismissedOverride, setDismissedOverride] = useState(false);
  const storedDismissed = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return localStorage.getItem(dismissKey()) === "1";
      } catch {
        return false;
      }
    },
    getServerSnapshot
  );

  if (usedPct < 80 || storedDismissed || dismissedOverride) return null;

  const atLimit = usedPct >= 100;

  function dismiss() {
    try {
      localStorage.setItem(dismissKey(), "1");
    } catch {
      /* private mode: still hide for this session */
    }
    setDismissedOverride(true);
  }

  return (
    <div
      className={`flex items-center gap-3 rounded-2xl border border-line px-4 py-3 ${
        atLimit ? "bg-bad-soft" : "bg-warn-soft"
      }`}
    >
      <LightningIcon size={18} weight="fill" className={atLimit ? "text-bad" : "text-warn"} />
      <p className={`flex-1 text-sm ${atLimit ? "text-bad" : "text-warn"}`}>
        {atLimit
          ? "You've used all your credits this month."
          : `You've used ${Math.round(usedPct)}% of your monthly credits.`}{" "}
        <Link href="/app/billing?upgrade=1" className="font-medium underline underline-offset-2">
          View plans
        </Link>
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className={`shrink-0 rounded-full p-1 transition-colors ${atLimit ? "text-bad" : "text-warn"} hover:opacity-70`}
      >
        <XIcon size={14} weight="bold" />
      </button>
    </div>
  );
}
