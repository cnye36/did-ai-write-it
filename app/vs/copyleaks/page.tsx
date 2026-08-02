import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircleIcon,
  PhoneCallIcon,
  UsersThreeIcon,
  GlobeIcon,
  BuildingsIcon,
} from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { CtaPanel } from "@/components/cta-panel";
import { BrandName } from "@/components/brand-name";
import { jsonLdScriptProps } from "@/lib/seo";

const TITLE = "Did AI Write It? vs Copyleaks: AI Detector Comparison";
const DESCRIPTION =
  "Copyleaks sells seats, contracts, and LMS integrations. Did AI Write It? is a flat monthly plan you can start using in the next minute. Here is the real difference.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/copyleaks" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/vs/copyleaks" },
};

const THEIR_PATH = [
  { icon: PhoneCallIcon, label: "Talk to sales", body: "Business and Enterprise tiers are quote-based." },
  { icon: UsersThreeIcon, label: "License seats", body: "Priced per user, billed to the organization." },
  { icon: BuildingsIcon, label: "Integrate", body: "Wire it into your LMS or API before anyone runs a check." },
];

const OUR_PATH = [
  { label: "Paste your draft", body: "No integration, no procurement." },
  { label: "Sign up free", body: "2,000 words a month, no card required." },
  { label: "Read your report", body: "AI detection, plagiarism, and fact-check, in seconds." },
];

const THEIR_TAGS = ["30+ language detection", "LMS integrations", "Team seats", "Audit logging", "Gen AI governance", "Custom API contracts"];
const OUR_TAGS = ["Free to start", "One flat monthly plan", "AI detection + plagiarism + fact-check", "No seats, no contract", "Self-serve signup"];

const FAQ = [
  {
    q: "Is Copyleaks better for a company than an individual?",
    a: "For an organization that needs LMS integration, audit logs, or detection across dozens of languages, Copyleaks' enterprise tooling is built for exactly that. For a single writer or small team checking their own drafts, that machinery is more setup than the job needs.",
  },
  {
    q: "Does Copyleaks have a free plan?",
    a: "Copyleaks offers a limited free tier, generally capped to a small number of pages a month. Did AI Write It?'s free plan runs on words instead of pages and includes plagiarism and fact-checking in the same allowance.",
  },
  {
    q: "Can I get an API to run checks programmatically?",
    a: "Not yet on Did AI Write It? Copyleaks' API access is one of its stronger features for teams building detection into their own workflow.",
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

export default function VsCopyleaksPage() {
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
        {/* Hero: the process itself is the argument, told as two horizontal step-tracks */}
        <section className="py-10 md:py-16">
          <Reveal>
            <h1 className="max-w-[18ch] text-4xl font-semibold leading-[1.05] tracking-tighter md:text-5xl">
              <BrandName /> vs Copyleaks
            </h1>
            <p className="mt-5 max-w-[52ch] text-lg leading-relaxed text-muted">
              Copyleaks is built to sell into organizations: seats, contracts,
              LMS integrations. Did AI Write It? is built to work the moment
              you paste something in.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
            >
              Sign up free
            </Link>
          </Reveal>

          <div className="mt-14 grid gap-10 md:grid-cols-2 md:gap-8">
            <Reveal delay={0.05}>
              <p className="text-xs font-medium text-faint">Copyleaks, Business tier</p>
              <ol className="mt-4 space-y-5">
                {THEIR_PATH.map((s, i) => (
                  <li key={s.label} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <s.icon size={18} weight="bold" className="text-faint" />
                      {i < THEIR_PATH.length - 1 && <div className="mt-2 h-8 w-px bg-line" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold tracking-tight text-muted">{s.label}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="text-xs font-medium text-faint">
                <BrandName />
              </p>
              <ol className="mt-4 space-y-5">
                {OUR_PATH.map((s, i) => (
                  <li key={s.label} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <CheckCircleIcon size={18} weight="bold" className="text-accent" />
                      {i < OUR_PATH.length - 1 && <div className="mt-2 h-8 w-px bg-accent/30" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold tracking-tight">{s.label}</p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">{s.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Reveal>
          </div>
        </section>

        {/* What each is actually built for, as tag clouds rather than a spec table */}
        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
              What each one is actually built for.
            </h2>
          </Reveal>
          <div className="mt-10 space-y-8">
            <Reveal delay={0.05}>
              <div>
                <div className="flex items-center gap-2">
                  <GlobeIcon size={18} weight="bold" className="text-muted" />
                  <p className="text-sm font-semibold tracking-tight">Copyleaks</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {THEIR_TAGS.map((t) => (
                    <span key={t} className="rounded-full border border-line px-3 py-1.5 text-sm text-muted">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <div>
                <div className="flex items-center gap-2">
                  <CheckCircleIcon size={18} weight="bold" className="text-accent" />
                  <p className="text-sm font-semibold tracking-tight">
                    <BrandName />
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {OUR_TAGS.map((t) => (
                    <span key={t} className="rounded-full bg-accent-soft px-3 py-1.5 text-sm text-ink">
                      {t}
                    </span>
                  ))}
                </div>
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
              heading="No procurement. Just a paste box."
              body="See your AI-detection, plagiarism, and fact-check score before a sales call would even get scheduled."
            />
          </Reveal>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
