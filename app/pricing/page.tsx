import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { Reveal } from "@/components/reveal";
import { PricingComparison } from "@/components/pricing/pricing-comparison";

export const metadata: Metadata = {
  title: "Pricing | Let AI Write It",
  description:
    "Compare every letaiwriteit.com plan: monthly word limits, per-request caps, real detector pass reports, and what's shipping next.",
};

export default function PricingPage() {
  return (
    <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
      <SiteHeader
        navLinks={
          <>
            <Link
              href="/#how"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              How it works
            </Link>
            <Link
              href="/#analyze"
              className="hidden text-sm text-muted transition-colors hover:text-ink sm:block"
            >
              The signals
            </Link>
          </>
        }
      />

      <section className="py-10 text-center md:py-16">
        <Reveal>
          <h1 className="text-4xl font-semibold tracking-tighter md:text-6xl">
            Simple pricing, real limits
          </h1>
          <p className="mx-auto mt-4 max-w-[52ch] text-lg leading-relaxed text-muted">
            Detection is always free. Pick a plan for how much you rewrite each
            month, and how long a single draft can be.
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
