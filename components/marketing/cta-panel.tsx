import Link from "next/link";
import { FingerprintIcon } from "@phosphor-icons/react/dist/ssr";

/** Self-contained dark panel (independent of site theme, like the photo it
 * replaces): every draft has a "fingerprint" a detector reads, that's the
 * one motivated visual, not decoration. */
export function CtaPanel({
  heading,
  body,
  ctaLabel = "Sign up free",
  ctaHref = "/signup",
}: {
  heading: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
}) {
  return (
    <div className="relative flex min-h-[380px] items-end overflow-hidden rounded-3xl bg-[#0e1015]">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 100% at 85% 0%, #2b3a8f 0%, transparent 55%), linear-gradient(160deg, #0e1015 20%, #141830 100%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <FingerprintIcon
        size={340}
        weight="thin"
        className="pointer-events-none absolute -right-12 -top-16 text-white/[0.07]"
      />
      <div className="relative w-full px-6 py-12 text-center text-white sm:px-12 sm:py-16">
        <h2 className="mx-auto max-w-[26ch] text-3xl font-semibold tracking-tighter md:text-5xl">
          {heading}
        </h2>
        <p className="mx-auto mt-4 max-w-[46ch] text-white/75">{body}</p>
        <Link
          href={ctaHref}
          className="mt-8 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
