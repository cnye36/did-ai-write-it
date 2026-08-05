"use client";

import { useState } from "react";
import { GoogleLogoIcon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { safeAuthNext } from "@/lib/auth-next";
import { setMarketingEmailsIntentCookie } from "@/lib/marketing-emails";
import posthog from "posthog-js";

export function GoogleSignInButton({
  next,
  label = "Continue with Google",
  /** Only pass from signup. Login must omit this so returning users keep their preference. */
  marketingEmails,
}: {
  next?: string;
  label?: string;
  marketingEmails?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onClick() {
    posthog.capture("google_sign_in_started");
    setBusy(true);
    setError(null);
    if (typeof marketingEmails === "boolean") {
      setMarketingEmailsIntentCookie(marketingEmails);
    }
    const destination = safeAuthNext(next ?? new URLSearchParams(window.location.search).get("next"));
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });
    if (oauthError) {
      setError(oauthError.message);
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onClick}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-full border border-line bg-surface px-6 py-3 text-sm font-medium text-ink transition-colors hover:bg-raised disabled:cursor-not-allowed disabled:opacity-40"
      >
        <GoogleLogoIcon size={18} weight="bold" aria-hidden />
        {busy ? "Redirecting..." : label}
      </button>
      {error && (
        <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>
      )}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3" aria-hidden>
      <div className="h-px flex-1 bg-line" />
      <span className="text-xs uppercase tracking-wide text-faint">or</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}
