"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { CreditCardIcon, SignOutIcon, SunIcon, MoonIcon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import type { Plan } from "@/lib/usage";

export function UserNav({
  email,
  plan,
  wordsUsed,
  wordLimit,
}: {
  email: string;
  plan: Plan;
  wordsUsed: number;
  wordLimit: number;
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initial = email.charAt(0).toUpperCase();
  const dark = resolvedTheme === "dark";

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex size-9 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent transition-transform active:scale-[0.96]"
      >
        {initial}
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 top-11 z-50 w-72 overflow-hidden rounded-2xl border border-line bg-raised shadow-xl"
        >
          <div className="flex items-center gap-3 px-4 py-4">
            <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-base font-semibold text-accent">
              {initial}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-ink">{email}</p>
              <p className="text-xs text-muted">
                {wordsUsed.toLocaleString()} / {wordLimit.toLocaleString()} words this month,{" "}
                <span className="capitalize">{plan}</span> plan
              </p>
            </div>
          </div>

          <div className="border-t border-line py-1">
            <Link
              href="/app/billing"
              onClick={() => setOpen(false)}
              role="menuitem"
              className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <CreditCardIcon size={17} weight="bold" />
              Billing
            </Link>
          </div>

          <div className="flex items-center justify-between border-t border-line px-4 py-2.5">
            <span className="text-sm text-muted">Appearance</span>
            <div className="inline-flex rounded-full border border-line p-0.5">
              <button
                type="button"
                onClick={() => setTheme("light")}
                aria-label="Light mode"
                aria-pressed={mounted && !dark}
                className={`inline-flex size-7 items-center justify-center rounded-full transition-colors ${
                  mounted && !dark ? "bg-accent text-accent-ink" : "text-faint hover:text-ink"
                }`}
              >
                <SunIcon size={14} weight="bold" />
              </button>
              <button
                type="button"
                onClick={() => setTheme("dark")}
                aria-label="Dark mode"
                aria-pressed={mounted && dark}
                className={`inline-flex size-7 items-center justify-center rounded-full transition-colors ${
                  mounted && dark ? "bg-accent text-accent-ink" : "text-faint hover:text-ink"
                }`}
              >
                <MoonIcon size={14} weight="bold" />
              </button>
            </div>
          </div>

          <div className="border-t border-line py-1">
            <button
              type="button"
              onClick={signOut}
              role="menuitem"
              className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-ink"
            >
              <SignOutIcon size={17} weight="bold" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
