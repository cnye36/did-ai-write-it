"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import posthog from "posthog-js";

export function MarketingEmailsToggle({ initialEnabled }: { initialEnabled: boolean }) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onChange(next: boolean) {
    setBusy(true);
    setError(null);
    const previous = enabled;
    setEnabled(next);
    try {
      const supabase = createClient();
      const { error: rpcError } = await supabase.rpc("set_marketing_emails", {
        p_enabled: next,
      });
      if (rpcError) throw rpcError;
      posthog.capture("marketing_emails_preference_changed", { enabled: next });
    } catch (cause) {
      setEnabled(previous);
      setError(cause instanceof Error ? cause.message : "Could not save preference.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-line p-6 sm:p-8">
      <h3 className="text-sm font-semibold tracking-tight">Email preferences</h3>
      <p className="mt-2 max-w-[56ch] text-sm leading-relaxed text-muted">
        Optional product updates, new features, and tips. Account, billing, and security emails
        still send either way.
      </p>
      <label className="mt-4 flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          className="mt-1 accent-accent"
          checked={enabled}
          disabled={busy}
          onChange={(event) => void onChange(event.target.checked)}
        />
        <span className="text-sm leading-relaxed text-ink">
          Send me product updates and tips
        </span>
      </label>
      {error && <p className="mt-3 text-sm text-bad">{error}</p>}
    </section>
  );
}
