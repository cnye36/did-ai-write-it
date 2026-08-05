"use client";

import { useState } from "react";
import Link from "next/link";
import { ListIcon, XIcon } from "@phosphor-icons/react";

export function MobileNav({
  navLinks,
  isAuthed,
}: {
  navLinks: React.ReactNode;
  isAuthed: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        className="inline-flex size-9 items-center justify-center rounded-full border border-line text-muted transition-colors hover:text-ink active:scale-[0.96]"
      >
        {open ? <XIcon size={16} weight="bold" /> : <ListIcon size={16} weight="bold" />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-16 border-b border-line bg-surface px-4 py-3 shadow-[0_16px_40px_-24px_rgba(20,20,45,0.35)]">
          <div
            onClick={() => setOpen(false)}
            className="flex flex-col [&_a]:!flex [&_a]:!rounded-lg [&_a]:!px-3 [&_a]:!py-2.5 [&_a]:!text-base [&_a]:!text-ink"
          >
            {navLinks}
          </div>
          {!isAuthed && (
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="mt-2 flex items-center justify-center rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink"
            >
              Sign up free
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
