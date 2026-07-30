import type { Metadata } from "next";
import { ToolMarketingPage } from "@/components/tool-marketing-page";

const title = "AI Detector: Check Whether AI Wrote It";
const description =
  "Paste any draft for a real AI-detection score. Check up to 300 words free, then sign up to scan longer text and see the full report.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/ai-detector" },
  openGraph: { title, description, url: "/ai-detector" },
};

export default function AiDetectorPage() {
  return (
    <ToolMarketingPage
      kind="detect"
      eyebrow="Free AI check, up to 300 words"
      title="Did AI write it?"
      description="Paste the draft you are unsure about. Get a real AI-detection score in seconds, then see exactly where the signal comes from."
      details={[
        { title: "A real detector, not a guess", body: "Your score is verified against a third-party detection model, not just a list of suspicious words." },
        { title: "Sentence-by-sentence detail", body: "Signed-in reports show the lines that contributed to the score, so you can judge the result in context." },
        { title: "Built for professional drafts", body: "Check a newsletter, campaign, report, or LinkedIn post before it goes out under your name." },
      ]}
      faq={[
        { q: "Is the AI detector free?", a: "Yes. You can run a real AI check on up to 300 words without an account. Create a free account for longer drafts and the complete report." },
        { q: "Can an AI detector be certain?", a: "No. A detection score is a strong signal, not proof. Review the result in context, especially for short or heavily edited text." },
        { q: "What happens when I paste more than 300 words?", a: "We will ask you to create a free account before any analysis runs. Your full draft follows you into the detector and is checked after signup." },
      ]}
    />
  );
}
