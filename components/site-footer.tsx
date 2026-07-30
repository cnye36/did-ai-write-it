import Link from "next/link";

const COMPARE_LINKS = [
  { href: "/vs/gptzero", label: "vs GPTZero" },
  { href: "/vs/originality-ai", label: "vs Originality.ai" },
  { href: "/vs/copyleaks", label: "vs Copyleaks" },
  { href: "/vs/turnitin", label: "vs Turnitin" },
];

const CHECK_LINKS = [
  { href: "/ai-detector", label: "AI detector" },
  { href: "/plagiarism-checker", label: "Plagiarism checker" },
  { href: "/fact-checker", label: "Fact checker" },
  { href: "/chatgpt-detector", label: "ChatGPT detector" },
  { href: "/claude-detector", label: "Claude detector" },
  { href: "/gemini-detector", label: "Gemini detector" },
  { href: "/ai-detector-for-linkedin", label: "AI detector for LinkedIn" },
];

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

export function SiteFooter() {
  return (
    <footer className="flex flex-col gap-8 border-t border-line py-12 md:flex-row md:items-start md:justify-between">
      <div>
        <p className="text-sm font-semibold tracking-tight">
          Did <span className="text-accent">AI </span> Write It?
        </p>
        <p className="mt-1 max-w-[46ch] text-sm text-muted">
          Real AI-detection scores for any draft. Built for professional
          writing, not for passing off homework.
        </p>
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
          {LEGAL_LINKS.map((l) => (
            <li key={l.href}>
              <Link href={l.href} className="text-xs text-faint transition-colors hover:text-ink">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-16">
        <div>
          <p className="text-xs font-medium text-faint">Compare</p>
          <ul className="mt-2 space-y-1.5">
            {COMPARE_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-muted transition-colors hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="text-xs font-medium text-faint">Checks</p>
          <ul className="mt-2 space-y-1.5">
            {CHECK_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="text-sm text-muted transition-colors hover:text-ink">
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <Link
          href="/signup"
          className="h-fit rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
        >
          Sign up free
        </Link>
      </div>
    </footer>
  );
}
