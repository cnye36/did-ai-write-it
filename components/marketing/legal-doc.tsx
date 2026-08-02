import type { ReactNode } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Reveal } from "@/components/ui/reveal";
import { LEGAL_EFFECTIVE_DATE } from "@/lib/seo";

export type LegalSection = {
  id: string;
  title: string;
  body: ReactNode;
};

export function LegalDoc({
  title,
  description,
  sections,
}: {
  title: string;
  description: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <SiteHeader
        navLinks={
          <>
            <Link
              href="/pricing"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              Pricing
            </Link>
            <Link
              href="/privacy"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              Terms
            </Link>
          </>
        }
      />

      <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
        <section className="border-b border-line py-10 md:py-14">
          <Reveal>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-faint">
              Effective {LEGAL_EFFECTIVE_DATE}
            </p>
            <h1 className="mt-3 max-w-[18ch] text-4xl font-semibold leading-[1.05] tracking-tighter md:text-5xl">
              {title}
            </h1>
            <p className="mt-4 max-w-[58ch] text-lg leading-relaxed text-muted">
              {description}
            </p>
          </Reveal>
        </section>

        <div className="grid gap-10 py-10 md:grid-cols-[220px_minmax(0,1fr)] md:gap-14 md:py-14">
          <aside className="md:sticky md:top-24 md:self-start">
            <p className="text-xs font-medium text-faint">On this page</p>
            <nav aria-label="Table of contents" className="mt-3">
              <ol className="space-y-2 border-l border-line pl-3">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="block text-sm leading-snug text-muted transition-colors hover:text-ink"
                    >
                      <span className="font-mono text-[10px] tabular-nums text-faint">
                        {String(i + 1).padStart(2, "0")}
                      </span>{" "}
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <article className="min-w-0 space-y-12">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} className="scroll-mt-28">
                <div className="flex items-baseline gap-3 border-b border-line pb-3">
                  <span className="font-mono text-xs tabular-nums text-faint">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h2 className="text-xl font-semibold tracking-tight md:text-2xl">
                    {s.title}
                  </h2>
                </div>
                <div className="legal-prose mt-5 max-w-[65ch] space-y-4 text-[15px] leading-relaxed text-muted [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline [&_strong]:font-medium [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
                  {s.body}
                </div>
              </section>
            ))}
          </article>
        </div>

        <SiteFooter />
      </div>
    </>
  );
}
