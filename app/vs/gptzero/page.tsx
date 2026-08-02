import type { Metadata } from "next";
import Link from "next/link";
import {
  GraduationCapIcon,
  EnvelopeSimpleOpenIcon,
  CheckCircleIcon,
  MinusCircleIcon,
} from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { CtaPanel } from "@/components/cta-panel";
import { Gauge } from "@/components/gauge";
import { BrandName } from "@/components/brand-name";
import { jsonLdScriptProps } from "@/lib/seo";

const TITLE = "Did AI Write It? vs GPTZero: Which AI Detector Should You Use?";
const DESCRIPTION =
  "GPTZero is built for classrooms. Did AI Write It? is built for professional drafts, and checks plagiarism and facts on the same paste. Here is how the two actually differ.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/gptzero" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/vs/gptzero" },
};

const CLUSTERS = [
  {
    title: "Detection & scoring",
    us: "One Winston-verified score per check, with every sentence flagged and reasoned individually.",
    them: "A per-document score plus a sentence-level burstiness breakdown, tuned for catching AI-written essays.",
  },
  {
    title: "Plagiarism & fact-checking",
    us: "Built in. The same paste runs a plagiarism scan and a claim-by-claim fact check, no second tool.",
    them: "Plagiarism scanning is available as a separate add-on. There is no fact-checking.",
  },
  {
    title: "Free tier & pricing",
    us: "2,000 words a month free, no card required, then flat monthly plans starting at $9.",
    them: "Offers a free tier with a monthly word cap, plus paid Individual, Pro, and Team plans. Confirm current limits and pricing at gptzero.me.",
  },
];

const FAQ = [
  {
    q: "Is Did AI Write It? more accurate than GPTZero?",
    a: "Neither tool is certain on every input. Did AI Write It? scores every check against Winston's real detection model rather than a heuristic, and shows the reasoning behind every flagged sentence so you can judge the call yourself.",
  },
  {
    q: "Can I use both GPTZero and Did AI Write It? on the same draft?",
    a: "Yes. Running a draft through more than one detector is a reasonable way to build confidence before a piece goes out, especially on borderline scores.",
  },
  {
    q: "Does Did AI Write It? have a free plan like GPTZero?",
    a: "Yes. The homepage runs a free instant scan with no account, and a free signed-in plan includes 2,000 words a month across AI detection, plagiarism, and fact-checking.",
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

export default function VsGptZeroPage() {
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
        {/* Asymmetric split hero: argument on the left, the "one score vs three" gap made visible on the right */}
        <section className="grid gap-10 py-10 md:grid-cols-[1.1fr_1fr] md:items-center md:gap-12 md:py-16">
          <Reveal>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tighter md:text-5xl">
              <BrandName /> vs GPTZero
            </h1>
            <p className="mt-5 max-w-[48ch] text-lg leading-relaxed text-muted">
              GPTZero built its name in classrooms, catching AI-written essays
              for teachers. Did AI Write It? is built for the professional
              draft going out under your name, and checks plagiarism and
              facts on the same paste, not just AI-likelihood.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
            >
              Sign up free
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="rounded-2xl border border-line bg-raised p-6 sm:p-8">
              <p className="text-xs font-medium text-faint">Same draft, one paste</p>
              <div className="mt-5 flex items-center justify-around gap-4">
                <Gauge score={82} color="var(--good)" label="AI detection" size={92} />
                <Gauge score={94} color="var(--good)" label="Originality" size={92} />
                <Gauge score={71} color="var(--warn)" label="Fact support" size={92} />
              </div>
              <p className="mt-5 text-center text-sm text-muted">
                All three from the report GPTZero&apos;s AI-detection score alone can&apos;t show.
              </p>
            </div>
          </Reveal>
        </section>

        {/* Built for different rooms */}
        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
              Built for different rooms.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <Reveal delay={0.05}>
              <div className="h-full rounded-2xl border border-line p-6 sm:p-8">
                <GraduationCapIcon size={24} weight="bold" className="text-muted" />
                <h3 className="mt-4 font-semibold tracking-tight">GPTZero: the classroom</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Started as, and still leans toward, a tool for teachers
                  checking whether a student wrote their own essay.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="h-full rounded-2xl bg-accent-soft p-6 sm:p-8">
                <EnvelopeSimpleOpenIcon size={24} weight="bold" className="text-accent" />
                <h3 className="mt-4 font-semibold tracking-tight">
                  <BrandName />: the inbox
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Built for the marketing copy, LinkedIn post, or report you
                  are about to send, not for grading homework.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Grouped comparison clusters, not a long spec table */}
        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">How they actually differ</h2>
          </Reveal>
          <div className="mt-10 space-y-4">
            {CLUSTERS.map((c) => (
              <Reveal key={c.title}>
                <div className="rounded-2xl border border-line p-6 sm:p-8">
                  <h3 className="font-semibold tracking-tight">{c.title}</h3>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <div className="flex gap-2.5">
                      <CheckCircleIcon size={18} weight="bold" className="mt-0.5 shrink-0 text-accent" />
                      <div>
                        <p className="text-xs font-medium text-faint">
                          <BrandName />
                        </p>
                        <p className="mt-0.5 text-sm leading-relaxed">{c.us}</p>
                      </div>
                    </div>
                    <div className="flex gap-2.5">
                      <MinusCircleIcon size={18} weight="bold" className="mt-0.5 shrink-0 text-faint" />
                      <div>
                        <p className="text-xs font-medium text-faint">GPTZero</p>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted">{c.them}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
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
              heading="See your score, not just theirs."
              body="Paste your draft and get an AI-detection, plagiarism, and fact-check score in one report."
            />
          </Reveal>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
