import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { DetectorHero } from "@/components/detector-hero";
import { Reveal } from "@/components/reveal";
import { CtaPanel } from "@/components/cta-panel";
import { jsonLdScriptProps } from "@/lib/seo";

const TITLE = "AI Detector for LinkedIn Posts: Check Before You Post";
const DESCRIPTION =
  "Paste your LinkedIn post or comment and get a real, Winston-verified AI-detection score before you post it. Free instant check, no account needed.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ai-detector-for-linkedin" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/ai-detector-for-linkedin" },
};

const FAQ = [
  {
    q: "Will this flag normal, polished business writing as AI?",
    a: "Clean, professional writing on its own is not a red flag. The score responds to flattened sentence rhythm, stock phrasing, and predictable structure, the specific patterns AI writing tends to leave, not to correct grammar or a confident tone.",
  },
  {
    q: "Does a high AI score mean LinkedIn will penalize my post?",
    a: "There is no public evidence that LinkedIn's algorithm scores posts for AI-likelihood directly. The real cost is reader trust: AI-sounding posts tend to get skimmed past or called out in the comments, which is the actual reason to check first.",
  },
  {
    q: "What should I do if my post scores as AI-written?",
    a: "Read the flagged sentences in the report and rewrite those specifically: vary the sentence length, cut the stock phrases, and commit to a claim instead of hedging it. A second pass on just the flagged lines is usually enough.",
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

export default function AiDetectorForLinkedInPage() {
  return (
    <>
      <script {...jsonLdScriptProps(FAQ_JSON_LD)} />
      <SiteHeader navLinks={null} />

      <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
        <section className="py-10 md:py-16">
          <div className="mx-auto max-w-2xl text-center">
            <Reveal>
              <h1 className="text-4xl font-semibold leading-[1.05] tracking-tighter md:text-6xl">
                Does your LinkedIn post read like AI wrote it?
              </h1>
              <p className="mx-auto mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">
                Paste your draft below and see how it scores before you post,
                not after someone calls it out in the comments.
              </p>
            </Reveal>
          </div>
          <Reveal delay={0.12} className="mx-auto mt-10 max-w-4xl">
            <DetectorHero />
          </Reveal>
        </section>

        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
                LinkedIn reads differently than an inbox.
              </h2>
              <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-muted">
                An email gets read by one person. A post gets read by
                everyone in your network, and an AI-sounding opener is the
                fastest way to lose the scroll.
              </p>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            <Reveal delay={0.05}>
              <div className="h-full rounded-2xl border border-line p-6 sm:p-8">
                <p className="text-xs font-medium text-faint">Reads machine-made</p>
                <p className="mt-3 text-sm leading-relaxed">
                  <mark data-flag="">
                    In today&apos;s fast-paced business landscape, adaptability is not
                    just an advantage, it is a necessity.
                  </mark>
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="h-full rounded-2xl bg-accent-soft p-6 sm:p-8">
                <p className="text-xs font-medium text-faint">Reads like a person</p>
                <p className="mt-3 text-sm leading-relaxed">
                  We lost our biggest client in March. Here is what that
                  actually taught me about pricing.
                </p>
              </div>
            </Reveal>
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
              heading="Check your post before it goes live."
              body="Paste your draft and see the score in seconds. No card required to start."
            />
          </Reveal>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
