import type { Metadata } from "next";
import { ToolMarketingPage } from "@/components/marketing/tool-marketing-page";

const title = "Plagiarism Checker: Find Matching Sources";
const description =
  "Paste a draft to check it for matching web sources. Create a free account to run the scan and see highlighted overlap in context.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/plagiarism-checker" },
  openGraph: { title, description, url: "/plagiarism-checker" },
};

export default function PlagiarismCheckerPage() {
  return (
    <ToolMarketingPage
      kind="plagiarism"
      eyebrow="Source matching for working drafts"
      title="Know what your draft overlaps with."
      description="Paste your text, create a free account, and scan it for matching sources before you publish or send it."
      details={[
        { title: "Sources, not a mystery score", body: "See the pages that overlap with your draft and how much of the text is implicated." },
        { title: "Highlights in the original text", body: "Matched passages are marked inline so you can review the exact wording without comparing documents by hand." },
        { title: "One workspace for every check", body: "Run AI detection and fact checking on the same text when you need a fuller content-integrity read." },
        { title: "Checks well over a hundred languages", body: "Source matching is not limited to English drafts, so translated or multilingual content gets the same scan." },
      ]}
      faq={[
        { q: "Can I check plagiarism for free?", a: "A free account includes monthly credits for plagiarism checks. We ask you to sign up before running a scan because source matching is a full report, not a preview." },
        { q: "Will this scan my text before I sign up?", a: "No. The text box only prepares your draft for the next step. We do not run a plagiarism analysis until you have created or signed in to an account." },
        { q: "What does a plagiarism result show?", a: "Your report includes an overlap score, matching sources, and inline highlights that show where the source overlap appears in your text." },
      ]}
    />
  );
}
