"use client";

import { useState } from "react";
import posthog from "posthog-js";

type PortalFlow = "manage" | "cancel";

export function ManageSubscriptionButton({
  flow = "manage",
  label,
  className,
}: {
  flow?: PortalFlow;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultLabel =
    flow === "cancel" ? "Cancel subscription" : "Manage billing";

  async function openPortal() {
    posthog.capture("billing_portal_opened", { flow });
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flow }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not open billing portal.");
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open billing portal.");
      setBusy(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={openPortal}
        disabled={busy}
        className={
          className ??
          "rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-faint disabled:cursor-not-allowed disabled:opacity-40"
        }
      >
        {busy ? "Opening..." : (label ?? defaultLabel)}
      </button>
      {error && <p className="mt-2 text-sm text-bad">{error}</p>}
    </div>
  );
}
