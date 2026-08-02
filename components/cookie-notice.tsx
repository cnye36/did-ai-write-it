"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { XIcon } from "@phosphor-icons/react";

const STORAGE_KEY = "daw.cookieNotice";

/**
 * Informational notice only. We currently set essential auth cookies and
 * device-local preferences (theme / handoff), not advertising or analytics
 * cookies, so a full Accept/Reject CMP is not required. If non-essential
 * cookies are added later, replace this with a real consent gate.
 */
export function CookieNotice() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "dismissed") {
        setTimeout(() => setVisible(true), 100);
      }
    } catch {
      setTimeout(() => setVisible(true), 100);
    }
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(STORAGE_KEY, "dismissed");
    } catch {
      /* private mode: still hide for this session */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie notice"
      className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6"
    >
      <div className="mx-auto flex max-w-[720px] items-start gap-4 rounded-2xl border border-line bg-raised/95 p-4 shadow-[0_12px_40px_-16px_color-mix(in_oklab,var(--ink)_28%,transparent)] backdrop-blur sm:p-5">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium tracking-tight text-ink">
            Essential cookies only
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            We use cookies to keep you signed in and secure. Theme preference
            stays on your device. No advertising or analytics cookies today.{" "}
            <Link
              href="/privacy#cookies"
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Privacy Policy
            </Link>
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={dismiss}
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
          >
            Got it
          </button>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss cookie notice"
            className="rounded-full p-2 text-faint transition-colors hover:bg-surface hover:text-ink"
          >
            <XIcon size={16} weight="bold" />
          </button>
        </div>
      </div>
    </div>
  );
}
