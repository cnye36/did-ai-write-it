"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeAuthNext } from "@/lib/auth-next";
import { AuthDivider, GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import posthog from "posthog-js";

const MIN_PASSWORD_LENGTH = 6;

function TermsNote() {
  return (
    <p className="text-xs leading-relaxed text-faint">
      By creating an account you agree to our{" "}
      <Link href="/terms" className="text-muted underline-offset-2 hover:text-ink hover:underline">
        Terms of Use
      </Link>{" "}
      and{" "}
      <Link href="/privacy" className="text-muted underline-offset-2 hover:text-ink hover:underline">
        Privacy Policy
      </Link>
      .
    </p>
  );
}

export function SignupForm({ next }: { next?: string }) {
  const router = useRouter();
  const destination = safeAuthNext(next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });
    if (signUpError) {
      setError(signUpError.message);
      setBusy(false);
      return;
    }
    if (data.session && data.user) {
      posthog.capture("user_signed_up", { method: "password", confirmation_required: false });
      router.push(destination);
      router.refresh();
      return;
    }
    posthog.capture("user_signed_up", { method: "password", confirmation_required: true });
    setCheckEmail(true);
    setBusy(false);
  }

  async function onVerifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const token = code.trim();
    if (!token) {
      setError("Enter the confirmation code from your email.");
      return;
    }

    setBusy(true);
    const supabase = createClient();
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "signup",
    });
    if (verifyError) {
      setError(verifyError.message);
      setBusy(false);
      return;
    }
    if (data.session && data.user) {
      posthog.capture("user_signed_up", { method: "password", confirmation_required: true, verified_via: "otp" });
      router.push(destination);
      router.refresh();
      return;
    }
    setError("Could not verify that code. Try again or use the link in the email.");
    setBusy(false);
  }

  if (checkEmail) {
    return (
      <div className="space-y-4">
        <div className="rounded-[10px] bg-accent-soft px-4 py-3 text-sm leading-relaxed text-ink">
          <p>
            Confirmation email sent to <span className="font-medium">{email}</span>. Open the
            link, or enter the code below.
          </p>
          <p className="mt-2 text-muted">
            Do not see it? Check your spam or junk folder, we are still new aand growing.
          </p>
        </div>
        <form onSubmit={onVerifyCode} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="confirmation-code" className="text-sm font-medium">
              Confirmation code
            </label>
            <input
              id="confirmation-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoFocus
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="6-digit code"
              className="w-full rounded-[10px] border border-line bg-surface p-3 text-sm tracking-widest outline-none transition-colors placeholder:text-faint placeholder:tracking-normal focus:border-accent"
            />
          </div>
          {error && (
            <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Verifying..." : "Verify and continue"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <GoogleSignInButton next={destination} label="Sign up with Google" />
      <AuthDivider />
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-[10px] border border-line bg-surface p-3 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <input
            id="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-[10px] border border-line bg-surface p-3 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor="confirm-password" className="text-sm font-medium">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded-[10px] border border-line bg-surface p-3 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent"
          />
        </div>
        {error && (
          <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Creating account..." : "Create account"}
        </button>
      </form>
      <TermsNote />
    </div>
  );
}
