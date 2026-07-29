const FAQ = [
  {
    q: "What's a credit?",
    a: "One credit roughly equals one word of AI-detection scoring. Every plan's monthly credit allowance is shared across AI detection, plagiarism, and fact-checking.",
  },
  {
    q: "Why do plagiarism and fact checks use more credits?",
    a: "Both run a real web search behind the scenes, so each costs more to run than a detection score. A word checked for plagiarism or facts draws twice the credits of the same word checked for AI.",
  },
  {
    q: "What happens if I run out of credits?",
    a: "Checks are blocked until your allowance resets or you upgrade. Upgrading takes effect immediately, so you can pick up right where you left off.",
  },
  {
    q: "Do unused credits roll over?",
    a: "No. Your allowance resets to the plan amount at the start of each monthly billing period.",
  },
  {
    q: "Can I change plans anytime?",
    a: "Yes. Upgrade or downgrade whenever you like from this page, or manage your subscription directly from the billing portal.",
  },
];

export function PricingFaq() {
  return (
    <div>
      <h2 className="text-lg font-semibold tracking-tight">Billing questions</h2>
      <div className="mt-4 divide-y divide-line border-y border-line">
        {FAQ.map((f) => (
          <details key={f.q} className="group py-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-medium tracking-tight">
              {f.q}
              <span className="text-faint transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="mt-2 max-w-[64ch] text-sm leading-relaxed text-muted">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
