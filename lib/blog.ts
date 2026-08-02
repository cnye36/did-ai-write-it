export type BlogPost = {
  slug: string;
  title: string;
  /** Meta description / OG description, ~155 chars. */
  description: string;
  /** Shown on the index card, one or two sentences. */
  excerpt: string;
  /** ISO date, e.g. "2026-08-02". */
  date: string;
  readingTime: string;
  category: string;
};

/** Newest first. Add future posts to the top of this array. */
export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "ai-detector-false-positives",
    title: "The False Positive Problem: Why AI Detectors Flag Real Human Writing",
    description:
      "AI detectors have wrongly flagged real student and professional writing as machine-generated, and non-native English speakers get hit hardest. Here is what causes it and how to read a score responsibly.",
    excerpt:
      "Every AI detector, ours included, sometimes flags writing no model ever touched. Here is why that happens and how to read a score without turning it into an accusation.",
    date: "2026-08-02",
    readingTime: "7 min read",
    category: "AI detection",
  },
];

export function getPostBySlug(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

export function formatBlogDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
