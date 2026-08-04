import { InfoIcon } from "@phosphor-icons/react";

/**
 * Native <details>/<summary> so the popover works with a tap on mobile, not
 * just hover, and needs no client-side state.
 */
export function InfoTooltip({ text }: { text: string }) {
  return (
    <details className="group relative inline-block align-middle">
      <summary className="inline-flex cursor-pointer list-none items-center text-faint outline-none transition-colors hover:text-ink focus-visible:text-ink [&::-webkit-details-marker]:hidden">
        <InfoIcon size={13} weight="bold" />
      </summary>
      <div className="absolute left-1/2 top-full z-20 mt-1.5 w-56 -translate-x-1/2 rounded-[10px] border border-line bg-raised p-2.5 text-[11px] leading-relaxed text-muted shadow-[0_12px_32px_-12px_rgba(20,20,45,0.35)] dark:shadow-none">
        {text}
      </div>
    </details>
  );
}
