import Link from "next/link";
import Image from "next/image";
import {
  CheckCircleIcon,
  WaveformIcon,
  TextAlignLeftIcon,
  QuotesIcon,
  PenNibIcon,
} from "@phosphor-icons/react/dist/ssr";
import { DetectorHero } from "@/components/detector-hero";
import { SiteHeader } from "@/components/site-header";
import { HowItWorks } from "@/components/how-it-works";
import { Reveal } from "@/components/reveal";
import { PLAN_INFO, PLAN_ORDER, formatPlanPrice } from "@/lib/plans";

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
];

export default function Landing() {
  return (
    <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
      <SiteHeader
        navLinks={
          <>
            <a
              href="#how"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              How it works
            </a>
            <a
              href="#analyze"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              The signals
            </a>
            <Link
              href="/pricing"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              Pricing
            </Link>
          </>
        }
      />

      {/* Tool-first hero */}
      <section className="py-10 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-medium text-muted">
              <CheckCircleIcon size={14} weight="bold" className="text-accent" />
              Free instant check. No account needed.
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tighter md:text-6xl">
              Did AI write it?
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
          <div className="relative flex min-h-[380px] items-end overflow-hidden rounded-3xl">
            <Image
              src="/img/writer-desk.jpg"
              alt="An unmarked grass trail cutting through a wide meadow"
              fill
              sizes="1160px"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/55 to-black/20" />
            <div className="relative w-full px-6 py-12 text-center text-white sm:px-12 sm:py-16">
              <h2 className="text-3xl font-semibold tracking-tighter md:text-5xl">
                Try it on the draft you are least sure about.
              </h2>
              <p className="mx-auto mt-4 max-w-[46ch] text-white/80">
                Paste it in and see the score in seconds. No card required
                to start.
              </p>
              <Link
                href="/signup"
                className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
              >
                Sign up free
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      <footer className="flex flex-col items-start justify-between gap-6 border-t border-line py-12 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            didaiwriteit<span className="text-accent">.com</span>
          </p>
          <p className="mt-1 max-w-[46ch] text-sm text-muted">
            Real AI-detection scores for any draft. Built for professional
            writing, not for passing off homework.
          </p>
        </div>
        <Link
          href="/signup"
          className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
        >
          Sign up free
        </Link>
      </footer>
    </div>
  );
}
