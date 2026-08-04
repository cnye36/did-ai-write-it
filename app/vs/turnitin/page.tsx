import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircleIcon, ProhibitIcon } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Reveal } from "@/components/ui/reveal";
import { CtaPanel } from "@/components/marketing/cta-panel";
import { jsonLdScriptProps } from "@/lib/seo";

const TITLE = "Did AI Write It? vs Turnitin: Can You Even Sign Up?";
const DESCRIPTION =
  "Turnitin isn't sold to individuals at all, only to schools on a contract. Did AI Write It? is a free plan anyone can start in the next minute. Here is the real comparison.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/turnitin" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/vs/turnitin" },
};

const FAQ = [
  {
    q: "Can I sign up for Turnitin myself?",
    a: "No. Turnitin is licensed to schools and universities on a contract, priced by faculty and student count. There is no individual checkout, and no self-serve plan.",
  },
  {
    q: "Is Turnitin's detection more accurate than Did AI Write It?",
    a: "There is no public way to compare the two directly. Turnitin builds its Similarity Report and AI writing detection for institutional academic-integrity workflows. Did AI Write It? scores professional drafts with our own verified detection model. They are built for different jobs.",
  },
  {
    q: "Should a school switch from Turnitin to Did AI Write It?",
    a: "No. This tool is built for checking marketing copy, LinkedIn posts, and reports before they go out, not for institutional academic-integrity enforcement. If you need that, Turnitin's LMS-embedded workflow is the right tool.",
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

export default function VsTurnitinPage() {
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
        {/* Editorial manifesto hero: the access gap IS the whole argument */}
        <section className="py-16 text-center md:py-24">
          <Reveal>
            <h1 className="mx-auto max-w-[16ch] text-4xl font-semibold leading-[1.05] tracking-tighter md:text-6xl">
              You can&apos;t sign up for Turnitin.
            </h1>
            <p className="mx-auto mt-5 max-w-[46ch] text-lg leading-relaxed text-muted">
              It is sold to schools on a contract, not to you. Did AI Write It?
              is a free plan anyone can start in the next minute.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
            >
              Sign up free
            </Link>
          </Reveal>
        </section>

        {/* Who can actually get in: two large-word bento cells */}
        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">Who can actually sign up.</h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            <Reveal delay={0.05}>
              <div className="h-full rounded-2xl border border-line p-6 sm:p-8">
                <ProhibitIcon size={22} weight="bold" className="text-faint" />
                <p className="mt-4 text-4xl font-semibold tracking-tighter text-muted">Institutions only</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Turnitin licenses run through a school or university&apos;s
                  contract with faculty and student counts. There is no
                  individual account.
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.12}>
              <div className="h-full rounded-2xl bg-accent-soft p-6 sm:p-8">
                <CheckCircleIcon size={22} weight="bold" className="text-accent" />
                <p className="mt-4 text-4xl font-semibold tracking-tighter">Anyone</p>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Sign up free with an email. 2,000 words a month across AI
                  detection, plagiarism, and fact-checking, no institution required.
                </p>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Honest scope note: different jobs, not a head-to-head */}
        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">
                Different rooms, on purpose.
              </h2>
              <p className="mx-auto mt-4 max-w-[46ch] leading-relaxed text-muted">
                Turnitin exists to enforce academic integrity inside a school&apos;s
                LMS. Did AI Write It? exists to check the professional draft
                you are about to send. Neither one is trying to replace the other.
              </p>
            </div>
          </Reveal>
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
              heading="No contract. No faculty count. Just sign up."
              body="Paste a draft and get a real AI-detection, plagiarism, and fact-check score today."
            />
          </Reveal>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
