import { verdictFor, type Verdict } from "./detector";

export type DetectionStrength = "strong" | "moderate" | "unclear";

export interface DetectionPresentation {
  verdict: Verdict;
  title: string;
  signal: string;
  description: string;
  strength: DetectionStrength;
}

export function detectionPresentation(score: number): DetectionPresentation {
  const verdict = verdictFor(score);

  if (verdict === "ai") {
    const strong = score <= 20;
    return {
      verdict,
      title: "Likely AI-generated",
      signal: strong ? "Strong AI signal" : "Moderate AI signal",
      description: "The text consistently matches patterns associated with AI-generated writing.",
      strength: strong ? "strong" : "moderate",
    };
  }

  if (verdict === "human") {
    const strong = score >= 90;
    return {
      verdict,
      title: "Likely human-written",
      signal: strong ? "Strong human signal" : "Moderate human signal",
      description: "The detector found few patterns strongly associated with AI-generated writing.",
      strength: strong ? "strong" : "moderate",
    };
  }

  return {
    verdict,
    title: "Mixed or unclear signals",
    signal: "Inconclusive",
    description: "The text contains both AI-like and human-like patterns, so authorship is unclear.",
    strength: "unclear",
  };
}

export function detectionTransition(fromScore: number, toScore: number): string {
  return `${detectionPresentation(fromScore).signal} to ${detectionPresentation(toScore).signal}`;
}
