import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DetectorHero } from "@/components/detector-hero";
import { Reveal } from "@/components/reveal";
import { CtaPanel } from "@/components/cta-panel";
import { jsonLdScriptProps } from "@/lib/seo";

const TITLE = "Gemini Detector: Check If Gemini Wrote It";
const DESCRIPTION =
  "Paste any email, report, or post and get a real, Winston-verified score for whether Gemini wrote it. Free instant check, no account needed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/gemini-detector" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/gemini-detector" },
};

const FAQ = [
  {
    q: "Can this tell Gemini apart from ChatGPT or Claude?",
    a: "The score reflects how machine-written the text reads overall, not which model produced it. Gemini's default style, heavy bolding, bulleted structure even in short answers, and frequent qualifiers, is the framing here, but the same check works on text from any model.",
  },
  {
    q: "Does turning bullet points into paragraphs fix the score?",
    a: "It helps, but only if the sentences underneath also change. Reformatting a bulleted list into prose while keeping the same flattened, over-qualified sentences usually is not enough to move the score much.",
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

export default function GeminiDetectorPage() {
  return (
    <>
      <script {...jsonLdScriptProps(FAQ_JSON_LD)} />
      <SiteHeader navLinks={null} />

      <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
        <section className="py-10 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tighter md:text-6xl">
                Did Gemini write it?
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

        {/* Flowing prose with inline tells, distinct from the list/grid treatment on the ChatGPT and Claude pages */}
        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <div className="mx-auto max-w-2xl">
              <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
                What Gemini leaves behind.
              </h2>
              <p className="mt-5 text-lg leading-relaxed text-muted">
                Its default style reaches for structure even where none is
                needed. A one-line answer still arrives as a bulleted list.
                A single idea still gets a bolded lead-in like{" "}
                <mark data-flag="">
                  <strong>Key takeaway:</strong> this approach saves time
                </mark>
                . And a plain claim usually gets wrapped in a qualifier
                first, something like{" "}
                <mark data-flag="">
                  It is important to note that results may vary depending on
                  the specific context
                </mark>
                . None of that is proof by itself, but stacked together
                across a whole draft, it reads machine-made.
              </p>
            </div>
          </Reveal>
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
