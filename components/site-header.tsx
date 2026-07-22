import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader({ navLinks }: { navLinks: React.ReactNode }) {
  return (
    <header className="flex h-16 items-center justify-between">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        letaiwriteit<span className="text-accent">.com</span>
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
    </header>
  );
}
