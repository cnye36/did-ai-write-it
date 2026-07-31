"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { safeAuthNext } from "@/lib/auth-next";
import { AuthDivider, GoogleSignInButton } from "@/components/auth/google-sign-in-button";

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
    if (data.session) {
      router.push(destination);
      router.refresh();
      return;
    }
    setCheckEmail(true);
    setBusy(false);
  }

  if (checkEmail) {
    return (
      <p className="rounded-[10px] bg-accent-soft px-4 py-3 text-sm leading-relaxed text-ink">
        Confirmation link sent to {email}. Click it to finish creating your account.
      </p>
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
