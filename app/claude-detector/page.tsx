import type { Metadata } from "next";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { DetectorHero } from "@/components/marketing/detector-hero";
import { Reveal } from "@/components/ui/reveal";
import { CtaPanel } from "@/components/marketing/cta-panel";
import { jsonLdScriptProps } from "@/lib/seo";

const TITLE = "Claude Detector: Check If Claude Wrote It";
const DESCRIPTION =
  "Paste any email, report, or post and get a real, Winston-verified score for whether Claude wrote it. Free instant check, no account needed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/claude-detector" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/claude-detector" },
};

const TELLS = [
  {
    label: "It hedges both sides before landing anywhere",
    example: "On one hand this saves time, though it is worth noting there are tradeoffs to consider as well.",
  },
  {
    label: "It closes by offering to keep going",
    example: "Let me know if you would like me to expand on any of this further.",
  },
  {
    label: "It reaches for structure even in plain prose",
    example: "There are a few key factors to keep in mind: first, second, and finally.",
  },
];

const FAQ = [
  {
    q: "Can this tell Claude apart from ChatGPT or Gemini?",
    a: "The score reflects how machine-written the text reads overall, not which model produced it. Claude's default style, careful hedging, offers to continue, reaching for structure, is the framing here, but the same check works on text from any model.",
  },
  {
    q: "Does rewriting Claude's output in my own voice fix the score?",
    a: "It can, if the rewrite actually changes sentence rhythm and cuts the hedges rather than just swapping a few words. A light polish on top of Claude's structure usually is not enough to move the score much.",
  },
  {
    q: "Is this the same free scan as the homepage?",
    a: "Yes. This page runs the same free, no-account check capped at 300 words a scan. Sign up for the full sentence-by-sentence report and a higher monthly word allowance.",
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

export default function ClaudeDetectorPage() {
  return (
    <>
      <script {...jsonLdScriptProps(FAQ_JSON_LD)} />
      <SiteHeader navLinks={null} />

      <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
        <section className="py-10 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tighter md:text-6xl">
                Did Claude write it?
              </h1>
              <p className="mx-auto mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">
                Paste the email, report, or post you are not sure about and
                get a real detection score in seconds, before it goes out
                under your name.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.12} className="mx-auto mt-10 max-w-4xl">
            <DetectorHero />
          </Reveal>
        </section>

        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
              What Claude leaves behind.
            </h2>
            <p className="mt-4 max-w-[52ch] leading-relaxed text-muted">
              Its default style has a handful of tics. None on its own is
              proof, but stack a few together and a draft starts to read
              machine-made.
            </p>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {TELLS.map((t) => (
              <Reveal key={t.label}>
                <div className="h-full rounded-2xl border border-line p-5">
                  <p className="text-sm font-semibold tracking-tight">{t.label}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted">
                    <mark data-flag="">{t.example}</mark>
                  </p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

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
              heading="Check it before you hit send."
              body="Paste the draft you are least sure about and see the score in seconds."
            />
          </Reveal>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
