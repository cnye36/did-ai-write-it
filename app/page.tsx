import Link from "next/link";
import {
  CheckCircleIcon,
  WaveformIcon,
  TextAlignLeftIcon,
  QuotesIcon,
  PenNibIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react/dist/ssr";
import { DetectorHero } from "@/components/marketing/detector-hero";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { Reveal } from "@/components/ui/reveal";
import { CtaPanel } from "@/components/marketing/cta-panel";
import { BrandName } from "@/components/marketing/brand-name";
import { SITE_URL, jsonLdScriptProps } from "@/lib/seo";

const SIGNALS = [
  {
    icon: WaveformIcon,
    title: "Burstiness",
    body: "Humans vary sentence length without thinking. Models flatten it. Detectors weight this signal hardest.",
    tint: false,
  },
  {
    icon: TextAlignLeftIcon,
    title: "Rhythm",
    body: "Runs of same-length sentences read machine-made. We flag every one and show you where.",
    tint: false,
  },
  {
    icon: QuotesIcon,
    title: "Vocabulary",
    body: "Delve, seamless, robust, a testament to. The stock words that scream generative AI.",
    tint: true,
  },
  {
    icon: PenNibIcon,
    title: "Punctuation",
    body: "Em-dash pileups and stacked rule-of-three lists are among the loudest tells.",
    tint: true,
  },
];

const CHECKS = [
  { title: "AI detection", body: "A real, Winston-verified score for every sentence." },
  { title: "Plagiarism", body: "Matched sources and highlighted overlap, inline." },
  { title: "Fact-check", body: "Claim-by-claim verdicts with sources, not just a score." },
];

const COMPARE_LINKS = [
  { href: "/vs/gptzero", vs: "GPTZero" },
  { href: "/vs/originality-ai", vs: "Originality.ai" },
  { href: "/vs/copyleaks", vs: "Copyleaks" },
  { href: "/vs/turnitin", vs: "Turnitin" },
];

const FAQ = [
  {
    q: "How does the AI detector work?",
    a: "Paste or upload any text and it is scanned sentence by sentence for the patterns AI writing leaves behind: flattened sentence rhythm, stock vocabulary, and predictable structure. You get a 0 to 100 score plus the reasoning behind every flagged line.",
  },
  {
    q: "How accurate is the AI detection score?",
    a: "No detector, ours included, is 100 percent certain on every input. Treat the score as a strong signal to investigate further, not a verdict on its own, especially on shorter drafts.",
  },
  {
    q: "What should I use this for?",
    a: "Checking any draft you are not sure about before it goes out: marketing copy, LinkedIn posts, newsletters, reports, and other professional writing. Not built for catching homework.",
  },
  {
    q: "What happens if I go over my word limit?",
    a: "The free check on this page caps out at 300 words per scan with a limited number of free scans per day. Sign up for a higher monthly word allowance and the full sentence-by-sentence report.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. Paste or upload text right in the browser and get a score in seconds. No account needed for a quick check.",
  },
  {
    q: "Does the AI detector work in languages other than English?",
    a: "Yes. AI detection covers a range of languages, including Spanish, French, German, Portuguese, and Chinese, and plagiarism checking covers well over a hundred. Accuracy is strongest in English and the other widely-supported languages; coverage keeps expanding.",
  },
];

const SOFTWARE_APPLICATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Did AI Write It?",
  url: SITE_URL,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description:
    "Real, Winston-verified AI-detection scoring, plus plagiarism and fact-checking, for any draft.",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    description: "Free plan, no credit card required",
  },
};

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: { "@type": "Answer", text: f.a },
  })),
};

export default function Landing() {
  return (
    <>
      <script {...jsonLdScriptProps(SOFTWARE_APPLICATION_JSON_LD)} />
      <script {...jsonLdScriptProps(FAQ_JSON_LD)} />
      <SiteHeader
        navLinks={
          <>
            <Link
              href="/ai-detector"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              AI detector
            </Link>
            <Link
              href="/plagiarism-checker"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              Plagiarism
            </Link>
            <Link
              href="/fact-checker"
              className="hidden text-sm text-muted transition-colors hover:text-ink md:block"
            >
              Fact check
            </Link>
            <Link
              href="/blog"
              className="hidden text-sm text-muted transition-colors hover:text-ink md:block"
            >
              Blog
            </Link>
            <Link
              href="/pricing"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              Pricing
            </Link>
          </>
        }
      />

      <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
      {/* Tool-first hero */}
      <section className="py-10 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-muted">
              <CheckCircleIcon size={14} weight="bold" className="text-accent" />
              Free instant check. No account needed.
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tighter md:text-6xl">
              <BrandName />
              <br />
              Paste it below to find out.
            </h1>
            <p className="mx-auto mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">
              Get an AI-detection score for any draft in seconds, down to
              the exact sentence, with the reasoning behind every flag.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.12} className="mx-auto mt-10 max-w-4xl">
          <DetectorHero />
        </Reveal>
      </section>

      <HowItWorks />

      {/* What we check: transparency differentiator */}
      <section id="analyze" className="border-t border-line py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-[1fr_1.15fr] md:gap-16">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
              Most detectors are a black box. We show ours.
            </h2>
            <p className="mt-4 max-w-[46ch] leading-relaxed text-muted">
              Detectors do not just say yes or no. They flag measurable patterns.
              We surface the same four, so you can see exactly why a draft reads
              machine-made, whether it is yours or someone else&apos;s.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid gap-3 sm:grid-cols-2">
              {SIGNALS.map((c) => (
                <div
                  key={c.title}
                  className={`rounded-2xl p-5 ${c.tint ? "bg-accent-soft" : "border border-line"}`}
                >
                  <c.icon size={20} weight="bold" className="text-accent" />
                  <h3 className="mt-3 text-sm font-semibold tracking-tight">{c.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{c.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* One paste, three checks: bundle differentiator vs single-purpose detectors */}
      <section className="border-t border-line py-20 md:py-28">
        <Reveal>
          <div className="mx-auto max-w-xl text-center">
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
              One paste, three checks.
            </h2>
            <p className="mx-auto mt-4 max-w-[44ch] leading-relaxed text-muted">
              Most detectors stop at a single score. Every report here also
              checks the same text for plagiarism and unsupported claims,
              without opening a second tool.
            </p>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-[1.3fr_1fr]">
          <Reveal delay={0.05}>
            <div className="h-full rounded-2xl bg-accent-soft p-6 sm:p-8">
              <ul className="space-y-4">
                {CHECKS.map((c) => (
                  <li key={c.title} className="flex items-start gap-3">
                    <CheckCircleIcon size={20} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                    <div>
                      <Link
                        href={
                          c.title === "AI detection"
                            ? "/ai-detector"
                            : c.title === "Plagiarism"
                              ? "/plagiarism-checker"
                              : "/fact-checker"
                        }
                        className="text-sm font-semibold tracking-tight hover:text-accent"
                      >
                        {c.title}
                      </Link>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">{c.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
          <Reveal delay={0.12}>
            <div className="flex h-full flex-col justify-between rounded-2xl border border-line p-6 sm:p-8">
              <div>
                <h3 className="font-semibold tracking-tight">See how we compare</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">
                  GPTZero and Originality.ai each do one thing well. Here is
                  how they stack up against a detector that checks all three.
                </p>
              </div>
              <ul className="mt-6 space-y-3">
                {COMPARE_LINKS.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group flex items-center justify-between text-sm font-medium text-ink transition-colors hover:text-accent"
                    >
                      <span>
                        <BrandName /> vs {l.vs}
                      </span>
                      <ArrowRightIcon
                        size={16}
                        weight="bold"
                        className="shrink-0 transition-transform group-hover:translate-x-0.5"
                      />
                    </Link>
                  </li>
                ))}
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

      {/* Closing CTA */}
      <section className="border-t border-line py-20 md:py-28">
        <Reveal>
          <CtaPanel
            heading="Try it on the draft you are least sure about."
            body="Paste it in and see the score in seconds. No card required to start."
          />
        </Reveal>
      </section>

      <SiteFooter />
      </div>
    </>
  );
}
