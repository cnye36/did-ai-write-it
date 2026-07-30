import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Reveal } from "@/components/reveal";
import { PricingComparison } from "@/components/pricing/pricing-comparison";

export const metadata: Metadata = {
  title: "Pricing | Did AI Write It",
  description:
    "Compare every Did AI Write It? plan: real, verified AI detection, monthly credit allowances, and what's shipping next.",
};

export default function PricingPage() {
  return (
    <>
      <SiteHeader
        navLinks={
          <>
            <Link
              href="/ai-detector"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              AI detector
            </Link>
            <Link
              href="/plagiarism-checker"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              Plagiarism
            </Link>
            <Link
              href="/pricing"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              Pricing
            </Link>
          </>
        }
      />

      <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
      <section className="py-10 text-center md:py-16">
        <Reveal>
          <h1 className="text-4xl font-semibold tracking-tighter md:text-6xl">
            Simple pricing for real AI detection
          </h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-lg leading-relaxed text-muted">
            A quick scan is free on the homepage, no account needed. Sign up
            and every plan checks up to 150,000 characters at a time against a
            real third-party detector, no per-request cap. Pick a plan for
            how many credits you need each month.
          </p>
        </Reveal>
      </section>

      <section className="border-t border-line py-16 md:py-20">
        <Reveal>
          <PricingComparison />
        </Reveal>
      </section>

      <footer className="flex flex-col items-start justify-between gap-6 border-t border-line py-12 md:flex-row md:items-center">
        <div>
          <p className="text-sm font-semibold tracking-tight">
            Did <span className="text-accent">AI </span> Write It?
          </p>
          <p className="mt-1 max-w-[46ch] text-sm text-muted">
            Detect AI writing with real, verified scoring. Built for professional
            content, not for passing off homework.
          </p>
          <p className="mt-3 flex gap-4 text-xs text-faint">
            <Link href="/privacy" className="transition-colors hover:text-ink">
              Privacy
            </Link>
            <Link href="/terms" className="transition-colors hover:text-ink">
              Terms
            </Link>
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
    </>
  );
}
