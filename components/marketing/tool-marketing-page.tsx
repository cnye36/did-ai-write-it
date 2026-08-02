import Link from "next/link";
import { CheckCircleIcon, TextAlignLeftIcon, MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { PublicToolForm } from "@/components/marketing/public-tool-form";
import { Reveal } from "@/components/ui/reveal";
import { CtaPanel } from "@/components/marketing/cta-panel";
import type { CheckKind } from "@/lib/handoff";
import { jsonLdScriptProps } from "@/lib/seo";

type ToolMarketingPageProps = {
  kind: CheckKind;
  title: string;
  description: string;
  eyebrow: string;
  details: { title: string; body: string }[];
  faq: { q: string; a: string }[];
};

export function ToolMarketingPage({
  kind,
  title,
  description,
  eyebrow,
  details,
  faq,
}: ToolMarketingPageProps) {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <script {...jsonLdScriptProps(faqJsonLd)} />
      <SiteHeader
        navLinks={
          <>
            <Link href="/ai-detector" className="hidden text-sm text-muted transition-colors hover:text-ink lg:block">
              AI detector
            </Link>
            <Link href="/plagiarism-checker" className="hidden text-sm text-muted transition-colors hover:text-ink lg:block">
              Plagiarism
            </Link>
            <Link href="/fact-checker" className="hidden text-sm text-muted transition-colors hover:text-ink lg:block">
              Fact check
            </Link>
            <Link href="/pricing" className="hidden text-sm text-muted transition-colors hover:text-ink lg:block">
              Pricing
            </Link>
          </>
        }
      />
      <main className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
        <section className="py-10 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-muted">
                <CheckCircleIcon size={14} weight="bold" className="text-accent" />
                {eyebrow}
              </span>
              <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tighter md:text-6xl">{title}</h1>
              <p className="mx-auto mt-5 max-w-[48ch] text-lg leading-relaxed text-muted">{description}</p>
            </Reveal>
          </div>
          <Reveal delay={0.12} className="mx-auto mt-10 max-w-4xl">
            <PublicToolForm kind={kind} />
          </Reveal>
        </section>

        <section className="border-t border-line py-20 md:py-28">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
                A clear answer, with the context to act on it.
              </h2>
              <p className="mt-4 max-w-[42ch] leading-relaxed text-muted">
                Results are made for a real working draft. You see the signal, the supporting detail, and the next
                step without having to switch tools.
              </p>
            </Reveal>
            <div className="divide-y divide-line border-y border-line">
              {details.map((detail, index) => (
                <Reveal key={detail.title} delay={index * 0.08}>
                  <div className="flex gap-4 py-5">
                    {index === 0 ? (
                      <MagnifyingGlassIcon size={20} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                    ) : (
                      <TextAlignLeftIcon size={20} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                    )}
                    <div>
                      <h3 className="font-semibold tracking-tight">{detail.title}</h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{detail.body}</p>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">Questions</h2>
          </Reveal>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {faq.map((item) => (
              <details key={item.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium tracking-tight">
                  {item.q}
                  <span className="text-faint transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <CtaPanel
              heading="One draft. A clearer read."
              body="Check AI signals, source overlap, and factual claims from the same workspace."
              ctaHref="/signup"
            />
          </Reveal>
        </section>
        <SiteFooter />
      </main>
    </>
  );
}
