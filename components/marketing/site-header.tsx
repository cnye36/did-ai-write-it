import Link from "next/link";
import { BrandLink } from "@/components/marketing/brand-link";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MobileNav } from "@/components/marketing/mobile-nav";
import { createClient } from "@/lib/supabase/server";

export async function SiteHeader({ navLinks }: { navLinks: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const isAuthed = Boolean(data?.claims);

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1160px] items-center justify-between px-4 sm:px-6">
        <BrandLink />
        <nav className="flex items-center gap-3 sm:gap-5">
          {navLinks}
          <ThemeToggle />
          {isAuthed ? (
            <Link
              href="/app/detect"
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="hidden text-sm font-medium text-ink sm:block">
                Log in
              </Link>
              <Link
                href="/signup"
                className="hidden rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] sm:block"
              >
                Sign up free
              </Link>
              <Link
                href="/login"
                className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] sm:hidden"
              >
                Log in
              </Link>
            </>
          )}
          <MobileNav navLinks={navLinks} isAuthed={isAuthed} />
        </nav>
      </div>
    </header>
  );
}
