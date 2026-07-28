"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app/detect", label: "Detector" },
  { href: "/app/plagiarism", label: "Plagiarism" },
  { href: "/app/fact-check", label: "Fact Check" },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-4">
      {LINKS.map((link) => {
        const active = pathname?.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`text-sm transition-colors ${active ? "font-medium text-ink" : "text-muted hover:text-ink"}`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
