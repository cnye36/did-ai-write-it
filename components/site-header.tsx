import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader({ navLinks }: { navLinks: React.ReactNode }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-[1160px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Did <span className="text-accent">AI </span> Write It?
        </Link>
        <nav className="flex items-center gap-5">
          {navLinks}
          <ThemeToggle />
          <Link href="/login" className="hidden text-sm font-medium text-ink sm:block">
            Log in
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
          >
            Sign up free
          </Link>
        </nav>
      </div>
    </header>
  );
}
