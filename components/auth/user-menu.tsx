"use client";

import { useRouter } from "next/navigation";
import { SignOutIcon } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";

export function UserMenu({ email }: { email: string }) {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      <span className="hidden max-w-[16ch] truncate text-xs text-faint sm:inline">
        {email}
      </span>
      <button
        type="button"
        onClick={signOut}
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
      >
        <SignOutIcon size={16} weight="bold" />
        <span className="hidden sm:inline">Sign out</span>
      </button>
    </div>
  );
}
