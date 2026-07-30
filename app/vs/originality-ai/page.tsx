import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircleIcon,
  MinusCircleIcon,
  MagicWandIcon,
  ChatCircleTextIcon,
} from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { CtaPanel } from "@/components/cta-panel";
import { jsonLdScriptProps } from "@/lib/seo";

const TITLE = "Did AI Write It vs Originality.ai: Free AI Detector Comparison";
const DESCRIPTION =
  "Originality.ai runs on paid credits with no free plan. Did AI Write It checks AI detection, plagiarism, and facts for free before you ever pay. Here is the real difference.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/originality-ai" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/vs/originality-ai" },
};

const FAQ = [
  {
    q: "Does Did AI Write It have a free plan like Originality.ai doesn't?",
    a: "Yes. The homepage runs a free instant scan with no account, and a free signed-in plan includes 2,000 words a month across AI detection, plagiarism, and fact-checking. Originality.ai has no free plan; every scan draws from paid credits.",
  },
  {
    q: "Is Originality.ai's plagiarism checker better?",
    a: "Both use real third-party scanning rather than a heuristic. Originality.ai's plagiarism check is billed as a separate, doubled credit cost on top of detection. Did AI Write It runs it as part of the same monthly word allowance.",
  },
  {
    q: "Can a content team use both tools?",
    a: "Some agencies do, especially if they already rely on Originality.ai's grammar or SEO tooling. For a straight AI-detection, plagiarism, and fact-check report on the same draft, one paste here covers all three.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function VsOriginalityAiPage() {
  return (
    <>
      <script {...jsonLdScriptProps(FAQ_JSON_LD)} />
      <SiteHeader
        navLinks={
          <Link href="/pricing" className="hidden text-sm text-muted transition-colors hover:text-ink sm:block">
            Pricing
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
        {/* Bento hero: the free-tier gap is the argument, made visible immediately */}
        <section className="grid gap-4 py-10 md:grid-cols-[1.2fr_1fr] md:py-16">
          <Reveal>
            <div className="flex h-full flex-col justify-center">
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tighter md:text-5xl">
                Did AI Write It vs Originality.ai
              </h1>
              <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-muted">
                Originality.ai is built for agencies checking freelance
                content at scale, priced in credits with no free tier. Did AI
                Write It gives you a real, verified score for free before you
                ever reach for a card.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex w-fit rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
              >
                Sign up free
              </Link>
            </div>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="flex h-full flex-col justify-center rounded-2xl bg-accent-soft p-6 sm:p-8">
              <p className="text-xs font-medium text-faint">Free plan, no card</p>
              <p className="mt-2 font-mono text-5xl font-semibold tabular-nums text-accent">2,000</p>
              <p className="text-sm text-muted">words a month, every check included</p>
              <div className="mt-6 border-t border-line/60 pt-4">
                <p className="text-xs font-medium text-faint">Originality.ai</p>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  No free plan. Every word spends a paid credit, doubled for plagiarism scans.
                </p>
              </div>
            </div>
          </Reveal>
        </section>

        {/* Where the credits go: honest, two-sided */}
        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
                Where the credits actually go.
              </h2>
              <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-muted">
                Originality.ai spends its credits on tooling for content
                operations. Did AI Write It spends its word allowance on one
                more check: whether the claims in the draft hold up.
              </p>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <Reveal delay={0.05}>
              <div className="h-full rounded-2xl border border-line p-6 sm:p-8">
                <MagicWandIcon size={24} weight="bold" className="text-muted" />
                <h3 className="mt-4 font-semibold tracking-tight">Originality.ai includes</h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed text-muted">
                  <li className="flex gap-2">
                    <MinusCircleIcon size={16} weight="bold" className="mt-0.5 shrink-0 text-faint" />
                    Readability scoring and a grammar checker
                  </li>
                  <li className="flex gap-2">
                    <MinusCircleIcon size={16} weight="bold" className="mt-0.5 shrink-0 text-faint" />
                    An SEO content optimizer and full-site scanning
                  </li>
                  <li className="flex gap-2">
                    <MinusCircleIcon size={16} weight="bold" className="mt-0.5 shrink-0 text-faint" />
                    No fact-checking
                  </li>
                </ul>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="h-full rounded-2xl bg-accent-soft p-6 sm:p-8">
                <ChatCircleTextIcon size={24} weight="bold" className="text-accent" />
                <h3 className="mt-4 font-semibold tracking-tight">Did AI Write It includes</h3>
                <ul className="mt-3 space-y-2 text-sm leading-relaxed">
                  <li className="flex gap-2">
                    <CheckCircleIcon size={16} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                    Sentence-level AI detection with reasoning per flag
                  </li>
                  <li className="flex gap-2">
                    <CheckCircleIcon size={16} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                    Plagiarism matches with inline source highlighting
                  </li>
                  <li className="flex gap-2">
                    <CheckCircleIcon size={16} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                    Claim-by-claim fact-checking with sources
                  </li>
                </ul>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">Questions</h2>
          </Reveal>
          <div className="mt-8 divide-y divide-line border-y border-line">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium tracking-tight">
                  {f.q}
                  <span className="text-faint transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-3 max-w-[64ch] text-sm leading-relaxed text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <CtaPanel
              heading="Start free. Upgrade only if you need to."
              body="No credits to buy before your first real score. Paste a draft and see for yourself."
            />
          </Reveal>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
