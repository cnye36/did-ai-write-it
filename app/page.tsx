import Link from "next/link";
import Image from "next/image";
import {
  CheckCircleIcon,
  ClipboardTextIcon,
  MagnifyingGlassIcon,
  PenNibIcon,
  WaveformIcon,
  TextAlignLeftIcon,
  QuotesIcon,
} from "@phosphor-icons/react/dist/ssr";
import { HumanizerHero } from "@/components/humanizer-hero";
import { SiteHeader } from "@/components/site-header";
import { Reveal } from "@/components/reveal";
import { PLAN_INFO, PLAN_ORDER, formatPlanPrice } from "@/lib/plans";

const STEPS = [
  {
    icon: ClipboardTextIcon,
    title: "Paste or upload",
    body: "Drop in anything AI wrote: a post, an essay draft, a whole newsletter. Text or file both work.",
    highlight: false,
  },
  {
    icon: MagnifyingGlassIcon,
    title: "See the tells",
    body: "Get an instant AI score and the exact signals behind it: flat rhythm, stock phrases, giveaway punctuation.",
    highlight: false,
  },
  {
    icon: PenNibIcon,
    title: "Rewrite until it's clean",
    body: "It keeps refining automatically until the score clears. No manual editing, no guessing whether it's done.",
    highlight: true,
  },
];

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
    body: "Runs of same-length sentences read machine-made. We find them and break them up.",
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
    q: "Is the detection score the same as GPTZero?",
    a: "It is a proxy built on the same measurable signals detectors use, so it moves in the same direction. It is meant to show you where a draft is weak and improving, not to replace a specific vendor's verdict. Paid plans add real detector pass reports.",
  },
  {
    q: "Does humanizing change what my text says?",
    a: "No. The rewrite targets the machine fingerprint (rhythm, stock phrasing, punctuation) while keeping your meaning and structure. You can compare before and after side by side.",
  },
  {
    q: "What should I use this for?",
    a: "Professional writing: marketing copy, LinkedIn posts, newsletters, and drafts where sounding human matters. It is built for people whose byline is their business.",
  },
  {
    q: "What happens if I go over my word limit?",
    a: "You will see the option to upgrade before any request fails. Free, Lite, Pro, and Studio each raise both the monthly total and the max length of a single rewrite.",
  },
  {
    q: "Do I need to install anything?",
    a: "No. Paste or upload text in the browser. Detection runs instantly with no account.",
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
              Free to check. No account needed.
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tighter md:text-6xl">
              AI wrote it.
              <br />
              Nobody will know.
            </h1>
            <p className="mx-auto mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">
              Paste your ChatGPT or Claude draft. We rewrite it until it reads
              human, not just different.
            </p>
          </Reveal>
        </div>
        <Reveal delay={0.12} className="mx-auto mt-10 max-w-4xl">
          <HumanizerHero />
        </Reveal>
      </section>

      {/* How it works */}
      <section id="how" className="border-t border-line py-20 md:py-28">
        <Reveal>
          <h2 className="max-w-[22ch] text-3xl font-semibold tracking-tighter md:text-4xl">
            From flagged to invisible
          </h2>
        </Reveal>
        <div className="mt-10 divide-y divide-line border-y border-line">
          {STEPS.map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <div
                className={`grid gap-4 py-8 sm:grid-cols-[auto_1fr] sm:items-start sm:gap-8 ${
                  s.highlight ? "-mx-4 rounded-2xl bg-accent-soft px-4 sm:-mx-6 sm:px-6" : ""
                }`}
              >
                <span
                  className={`inline-flex size-10 shrink-0 items-center justify-center rounded-full ${
                    s.highlight ? "bg-accent text-accent-ink" : "bg-accent-soft text-accent"
                  }`}
                >
                  <s.icon size={20} weight="bold" />
                </span>
                <div>
                  <h3 className="font-semibold tracking-tight">{s.title}</h3>
                  <p className="mt-1.5 max-w-[56ch] text-sm leading-relaxed text-muted">{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* What we check: transparency differentiator */}
      <section id="analyze" className="border-t border-line py-20 md:py-28">
        <div className="grid gap-10 md:grid-cols-[1fr_1.15fr] md:gap-16">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
              Most humanizers are a black box. We show ours.
            </h2>
            <p className="mt-4 max-w-[46ch] leading-relaxed text-muted">
              Detectors do not flag &ldquo;AI.&rdquo; They flag measurable patterns.
              We surface the same four, so you can see why a draft reads machine-made
              and watch each one improve after a rewrite.
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

      {/* Pricing */}
      <section id="pricing" className="border-t border-line py-20 md:py-28">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">Pricing</h2>
              <p className="mt-3 max-w-[48ch] leading-relaxed text-muted">
                Detection is always free. You only pay to rewrite, by how much you
                humanize each month.
              </p>
            </div>
            <Link
              href="/pricing"
              className="text-sm font-medium text-accent hover:underline"
            >
              Full comparison and annual plans
            </Link>
          </div>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PLAN_ORDER.map((plan, i) => {
            const info = PLAN_INFO[plan];
            const highlight = plan === "pro";
            return (
              <Reveal key={plan} delay={i * 0.05}>
                <div
                  className={`flex h-full flex-col rounded-2xl p-6 ${
                    highlight ? "bg-accent-soft" : "border border-line"
                  }`}
                >
                  <h3 className="font-semibold tracking-tight">{info.name}</h3>
                  <p className="mt-1 font-mono text-2xl font-semibold">
                    ${formatPlanPrice(info.priceMonthly)}
                    <span className="text-sm font-normal text-muted">/mo</span>
                  </p>
                  <ul className="mt-4 flex-1 space-y-2 text-sm leading-relaxed text-muted">
                    {info.features.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                  <Link
                    href={plan === "free" ? "/signup" : `/app/billing?plan=${plan}`}
                    className={`mt-6 rounded-full px-5 py-2.5 text-center text-sm font-medium transition-transform active:scale-[0.97] ${
                      highlight
                        ? "bg-accent text-accent-ink"
                        : "border border-line text-ink hover:border-faint"
                    }`}
                  >
                    {plan === "free" ? "Start free" : `Go ${info.name}`}
                  </Link>
                </div>
              </Reveal>
            );
          })}
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
                Try it on your worst AI draft.
              </h2>
              <p className="mx-auto mt-4 max-w-[46ch] text-white/80">
                The one that reads the most like a robot wrote it. That&apos;s
                the one we want. No card required to start.
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
            letaiwriteit<span className="text-accent">.com</span>
          </p>
          <p className="mt-1 max-w-[46ch] text-sm text-muted">
            Detect and humanize AI writing. Built for professional content, not for
            passing off homework.
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
