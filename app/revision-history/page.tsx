import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircleIcon,
  GitDiffIcon,
  PencilSimpleIcon,
  SparkleIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Reveal } from "@/components/reveal";
import { CtaPanel } from "@/components/cta-panel";
import { jsonLdScriptProps } from "@/lib/seo";

const title = "Revision History: Fix, Rescan & Diff Your Reports";
const description =
  "A flagged AI-detection report isn't a dead end. Fix what got flagged, rescan for a new verified score, and see exactly what changed and who changed it.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/revision-history" },
  openGraph: { title, description, url: "/revision-history" },
};

const STEPS = [
  {
    icon: CheckCircleIcon,
    title: "Get a verified report",
    body: "Run a check and see a real, verified score with a sentence-by-sentence breakdown of what's flagged.",
  },
  {
    icon: SparkleIcon,
    title: "Fix what's flagged",
    body: "Rewrite a sentence yourself, or ask for an AI-suggested rewrite. Nothing lands in your draft until you accept it.",
  },
  {
    icon: ArrowClockwiseIcon,
    title: "Rescan for a real score",
    body: "Scan again whenever you're ready. It's the same verified check, run again, not an estimate.",
  },
  {
    icon: GitDiffIcon,
    title: "See exactly what changed",
    body: "Compare any two reports side by side: what moved, whether the score improved, and whether you or the AI rewrote it.",
  },
];

const FAQ = [
  {
    q: "Does fixing and rescanning cost extra credits?",
    a: "An AI-suggested rewrite draws 2 credits per word from your monthly quota, the same rate as plagiarism and fact checks. Rescanning your edited text costs the normal AI-detection rate. There's no separate plan or add-on required.",
  },
  {
    q: "How many times can I rescan a report?",
    a: "As many as your monthly credits allow. Every rescan is saved as its own version, so you can always go back and compare.",
  },
  {
    q: "Is Revision History available on every plan?",
    a: "Yes, including Free. It's part of the AI detector, not a separate purchase.",
  },
  {
    q: "What does 'verified' mean in the editor?",
    a: "Only text that has actually been rescanned carries a real score. Anything you've since edited shows as not yet scanned until your next rescan, so you never mistake a guess for a verified result.",
  },
];

export default function RevisionHistoryPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((item) => ({
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
            <Link href="/pricing" className="hidden text-sm text-muted transition-colors hover:text-ink lg:block">
              Pricing
            </Link>
          </>
        }
      />
      <main className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
        <section className="py-10 text-center md:py-16">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-muted">
              <CheckCircleIcon size={14} weight="bold" className="text-accent" />
              Included on every plan
            </span>
            <h1 className="mx-auto mt-4 max-w-[20ch] text-4xl font-semibold leading-[1.05] tracking-tighter md:text-6xl">
              Fix it. Rescan it. See what changed.
            </h1>
            <p className="mx-auto mt-5 max-w-[52ch] text-lg leading-relaxed text-muted">
              A flagged report isn&apos;t a dead end. Revision History turns it into a
              working loop: fix what got flagged, rescan for a new verified score,
              and keep a full trail of every version along the way.
            </p>
          </Reveal>
        </section>

        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">How it works</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {STEPS.map((step, i) => (
              <Reveal key={step.title} delay={i * 0.06}>
                <div className="h-full rounded-2xl border border-line p-6">
                  <step.icon size={22} weight="bold" className="text-accent" />
                  <h3 className="mt-4 font-semibold tracking-tight">
                    {i + 1}. {step.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section className="border-t border-line py-20 md:py-28">
          <div className="grid gap-10 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
            <Reveal>
              <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
                A real trail, not a guess.
              </h2>
              <p className="mt-4 max-w-[42ch] leading-relaxed text-muted">
                Every version is a fact you can point to, not a claim you have to
                take on faith.
              </p>
            </Reveal>
            <div className="divide-y divide-line border-y border-line">
              {[
                {
                  icon: PencilSimpleIcon,
                  title: "You always know who wrote what",
                  body: "Sentences you type yourself and sentences from an AI-suggested rewrite are tracked separately, right up until you rescan and get a verified score for both.",
                },
                {
                  icon: ArrowClockwiseIcon,
                  title: "Verified rescans, every time",
                  body: "\"Scan again\" runs the same real, third-party-verified check as your first report. It's never a heuristic standing in for a real score.",
                },
                {
                  icon: GitDiffIcon,
                  title: "Compare any two reports",
                  body: "Pick any earlier version and see a word-level diff against your latest: what was added, removed, or rewritten, next to how the score moved.",
                },
              ].map((detail, index) => (
                <Reveal key={detail.title} delay={index * 0.08}>
                  <div className="flex gap-4 py-5">
                    <detail.icon size={20} weight="bold" className="mt-0.5 shrink-0 text-accent" />
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
            {FAQ.map((item) => (
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
              heading="Fix what's flagged. Prove it moved."
              body="Start with a free scan, then fix, rescan, and diff, all from your account."
              ctaHref="/signup"
            />
          </Reveal>
        </section>
        <SiteFooter />
      </main>
    </>
  );
}
