import type { ReactNode } from "react";

/** Accent callout for blog MDX: `<Callout>...</Callout>`. */
export function Callout({ children }: { children: ReactNode }) {
  return (
    <aside className="rounded-2xl bg-accent-soft p-6 text-ink sm:p-8 [&_p]:m-0 [&_p]:leading-relaxed">
      {children}
    </aside>
  );
}
