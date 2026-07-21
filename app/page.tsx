import Link from "next/link";
import {
  ClipboardTextIcon,
  MagnifyingGlassIcon,
  PenNibIcon,
  WaveformIcon,
  TextAlignLeftIcon,
  QuotesIcon,
} from "@phosphor-icons/react/dist/ssr";
import { HumanizerHero } from "@/components/humanizer-hero";
import { ThemeToggle } from "@/components/theme-toggle";
import { Reveal } from "@/components/reveal";

export default function Landing() {
  return (
    <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
      <header className="flex h-16 items-center justify-between">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          letaiwriteit<span className="text-accent">.com</span>
        </Link>
        <nav className="flex items-center gap-5">
          <a href="#how" className="hidden text-sm text-muted transition-colors hover:text-ink sm:block">
            How it works
          </a>
          <a href="#analyze" className="hidden text-sm text-muted transition-colors hover:text-ink sm:block">
            What we check
          </a>
          <a href="#pricing" className="hidden text-sm text-muted transition-colors hover:text-ink sm:block">
            Pricing
          </a>
          <ThemeToggle />
          <Link href="/app" className="hidden text-sm font-medium text-ink sm:block">
            Log in
          </Link>
          <Link
            href="/app"
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
          >
            Sign up free
          </Link>
        </nav>
      </header>

      {/* Tool-first hero */}
      <section className="py-10 md:py-16">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1 text-xs font-medium text-muted">
              <span className="size-1.5 rounded-full bg-good" /> Free AI detection, no account
            </span>
            <h1 className="mt-4 text-4xl font-semibold leading-[1.05] tracking-tighter md:text-6xl">
              Make AI writing
              <br />
              read like you wrote it.
            </h1>
            <p className="mx-auto mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">
              Paste your ChatGPT or Claude draft, see what gives it away, and
              rewrite it to sound human. Detection is free.
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
          <h2 className="max-w-[20ch] text-3xl font-semibold tracking-tighter md:text-4xl">
            Three steps from flagged to human
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              icon: ClipboardTextIcon,
              title: "Paste or upload",
              body: "Drop in anything AI wrote. A post, an essay draft, a whole newsletter. Text and file both work.",
            },
            {
              icon: MagnifyingGlassIcon,
              title: "See the tells",
              body: "Get an instant AI score and the exact signals behind it: flat rhythm, stock phrases, giveaway punctuation.",
            },
            {
              icon: PenNibIcon,
              title: "Rewrite human",
              body: "One click rewrites the flagged parts so the meaning stays and the machine fingerprint disappears.",
            },
          ].map((s, i) => (
            <Reveal key={s.title} delay={i * 0.06}>
              <div className="flex h-full flex-col rounded-2xl border border-line p-6">
                <span className="inline-flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <s.icon size={20} weight="bold" />
                </span>
                <h3 className="mt-4 font-semibold tracking-tight">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.body}</p>
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
              Most humanizers are a black box. Ours shows its work.
            </h2>
            <p className="mt-4 max-w-[46ch] leading-relaxed text-muted">
              Detectors do not flag &ldquo;AI.&rdquo; They flag measurable patterns.
              We surface the same four, so you can see why a draft reads machine-made
              and watch each one improve after a rewrite.
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                {
                  icon: WaveformIcon,
                  title: "Burstiness",
                  body: "Humans vary sentence length. Models flatten it. This is the signal detectors weight hardest.",
                },
                {
                  icon: TextAlignLeftIcon,
                  title: "Rhythm",
                  body: "Runs of same-length sentences read machine-made. We find them and break them up.",
                },
                {
                  icon: QuotesIcon,
                  title: "Vocabulary",
                  body: "Delve, seamless, robust, a testament to. The stock words that scream generative AI.",
                },
                {
                  icon: PenNibIcon,
                  title: "Punctuation",
                  body: "Em-dash pileups and stacked rule-of-three lists are among the loudest tells.",
                },
              ].map((c) => (
                <div key={c.title} className="rounded-2xl border border-line p-5">
                  <c.icon size={20} weight="bold" className="text-accent" />
                  <h3 className="mt-3 text-sm font-semibold tracking-tight">{c.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{c.body}</p>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* Secondary: on-brand voice */}
      <section className="border-t border-line py-20 md:py-28">
        <div className="grid items-center gap-10 md:grid-cols-[1.1fr_1fr] md:gap-16">
          <Reveal>
            <p className="text-sm font-medium uppercase tracking-[0.14em] text-faint">
              Beyond humanizing
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tighter md:text-4xl">
              Or write it in your voice from the start
            </h2>
            <div className="mt-4 space-y-4 leading-relaxed text-muted">
              <p>
                Humanizing fixes a draft after the fact. If you want to skip that
                step, teach it your voice once from a few things you actually wrote.
              </p>
              <p>
                It builds a fingerprint of your rhythm, phrasing, and opinions, then
                drafts new posts and newsletters that already sound like you. No
                rewrite needed.
              </p>
            </div>
            <Link
              href="/app/onboarding"
              className="mt-6 inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink transition-colors hover:border-faint active:scale-[0.97]"
            >
              Build my voice profile
            </Link>
          </Reveal>
          <Reveal delay={0.1}>
            <img
              src="/img/writer-desk.jpg"
              alt="A writer's desk in black and white"
              className="aspect-[4/3] w-full rounded-2xl border border-line object-cover"
              loading="lazy"
            />
          </Reveal>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-line py-20 md:py-28">
        <Reveal>
          <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">Pricing</h2>
          <p className="mt-3 max-w-[48ch] leading-relaxed text-muted">
            Detection is always free. Pay only for rewriting, by how much you
            humanize each month.
          </p>
        </Reveal>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              name: "Free",
              price: "$0",
              note: "",
              features: [
                "Unlimited AI detection",
                "Full signal breakdown",
                "500 humanized words / month",
                "Drafts saved in your browser",
              ],
              cta: "Start free",
              highlight: false,
            },
            {
              name: "Pro",
              price: "$19",
              note: "/mo planned",
              features: [
                "50,000 humanized words / month",
                "One saved voice profile",
                "Multi-pass rewriting",
                "Priority processing",
              ],
              cta: "Go Pro",
              highlight: true,
            },
            {
              name: "Studio",
              price: "$39",
              note: "/mo planned",
              features: [
                "200,000 humanized words / month",
                "Multiple voices, synced",
                "Real detector pass reports",
                "API access",
              ],
              cta: "Go Studio",
              highlight: false,
            },
          ].map((p, i) => (
            <Reveal key={p.name} delay={i * 0.05}>
              <div
                className={`flex h-full flex-col rounded-2xl p-6 ${
                  p.highlight ? "bg-accent-soft" : "border border-line"
                }`}
              >
                <h3 className="font-semibold tracking-tight">{p.name}</h3>
                <p className="mt-1 font-mono text-2xl font-semibold">
                  {p.price}
                  {p.note && <span className="text-sm font-normal text-muted">{p.note}</span>}
                </p>
                <ul className="mt-4 flex-1 space-y-2 text-sm leading-relaxed text-muted">
                  {p.features.map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <Link
                  href="/app"
                  className={`mt-6 rounded-full px-5 py-2.5 text-center text-sm font-medium transition-transform active:scale-[0.97] ${
                    p.highlight
                      ? "bg-accent text-accent-ink"
                      : "border border-line text-ink hover:border-faint"
                  }`}
                >
                  {p.cta}
                </Link>
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
          {[
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
              q: "Do I need to install anything?",
              a: "No. Paste or upload text in the browser. Detection runs instantly with no account.",
            },
          ].map((f) => (
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
          href="/app"
          className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
        >
          Sign up free
        </Link>
      </footer>
    </div>
  );
}
