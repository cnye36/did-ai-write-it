import type { Metadata } from "next";
import { ToolMarketingPage } from "@/components/marketing/tool-marketing-page";

const title = "AI Detector: Check Whether AI Wrote It";
const description =
  "Paste any draft for a real AI-detection score. Check 200-500 words free (3 checks a day), then sign up to scan longer text and see the full report.";

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
      eyebrow="Free AI check, 200-500 words, 3/day"
      title="Did AI write it?"
      description="Paste the draft you are unsure about. Get a real AI-detection score in seconds, then see exactly where the signal comes from."
      details={[
        { title: "A real detector, not a guess", body: "Your score comes from our verified detection model, not just a list of suspicious words." },
        { title: "Sentence-by-sentence detail", body: "Signed-in reports show the lines that contributed to the score, so you can judge the result in context." },
        { title: "Built for professional drafts", body: "Check a newsletter, campaign, report, or LinkedIn post before it goes out under your name." },
        { title: "Works beyond English", body: "Detection covers a range of languages, including Spanish, French, German, Portuguese, and Chinese, not just English drafts." },
      ]}
      faq={[
        { q: "Is the AI detector free?", a: "Yes. You can run up to 3 real AI checks a day on 200-500 words each without an account. Create a free account for longer drafts and the complete report." },
        { q: "Why is there a 200-word minimum?", a: "AI detectors, ours included, are unreliable on short text, close to a coin flip below a couple hundred words. We would rather ask for more text than hand you a score we don't trust." },
        { q: "Can an AI detector be certain?", a: "No. A detection score is a strong signal, not proof. Review the result in context, especially for short or heavily edited text." },
        { q: "What happens when I paste more than 500 words?", a: "We will ask you to create a free account before any analysis runs. Your full draft follows you into the detector and is checked after signup." },
      ]}
    />
  );
}
