/** Plagiarism score is the OPPOSITE polarity of the AI-detection score: higher = worse. */
export function plagiarismVerdict(score: number): { color: string; label: string } {
  if (score < 10) return { color: "var(--good)", label: "Looks original" };
  if (score < 25) return { color: "var(--warn)", label: "Some matches found" };
  return { color: "var(--bad)", label: "High overlap found" };
}

/** Same polarity as the AI-detection score: higher = better-supported. */
export function factCheckVerdict(score: number): { color: string; label: string } {
  if (score >= 80) return { color: "var(--good)", label: "Well-supported" };
  if (score >= 50) return { color: "var(--warn)", label: "Mixed support" };
  return { color: "var(--bad)", label: "Needs verification" };
}
