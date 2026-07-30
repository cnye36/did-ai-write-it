import type { Metadata } from "next";
import { ToolMarketingPage } from "@/components/tool-marketing-page";

const title = "Fact Checker: Verify Claims in Your Draft";
const description =
  "Paste a draft to check its factual claims against sources. Create a free account to run the check and review claim-by-claim verdicts.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/fact-checker" },
  openGraph: { title, description, url: "/fact-checker" },
};

export default function FactCheckerPage() {
  return (
    <ToolMarketingPage
      kind="fact_check"
      eyebrow="Claim-by-claim verification"
      title="Check the claims before they become a problem."
      description="Paste your draft, create a free account, and see which factual claims are supported, disputed, or missing evidence."
      details={[
        { title: "Verdicts for individual claims", body: "Review supported, partly supported, refuted, and not-enough-evidence claims instead of relying on one opaque score." },
        { title: "Sources alongside the explanation", body: "Every claim card explains the finding and links to the sources behind it, so review stays practical." },
        { title: "Made for publishing workflows", body: "Use it on newsletters, marketing copy, reports, and posts where a small unsupported claim can undermine trust." },
      ]}
      faq={[
        { q: "Does the fact checker analyze text before signup?", a: "No. We keep fact checking behind a free account. Pasting text here prepares the draft, but no claim analysis starts until you sign up or log in." },
        { q: "Can a fact checker verify everything?", a: "No tool can settle every claim. Treat results as a research aid and review the linked evidence before making high-stakes decisions." },
        { q: "How much text can I check?", a: "Fact checking supports drafts from 300 to 10,000 characters per request. Your signed-in workspace shows the current limit as you type." },
      ]}
    />
  );
}
