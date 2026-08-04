import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const BLOG_DIR = path.join(process.cwd(), "content/blog");

export type FeaturedImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export type BlogFrontmatter = {
  title: string;
  description: string;
  /** ISO date, e.g. "2026-08-02". */
  date: string;
  /** Empty string hides the byline. */
  author: string;
  categories: string[];
  tags: string[];
  featuredImage: FeaturedImage;
};

export type BlogPost = BlogFrontmatter & {
  slug: string;
  readingTime: string;
};

function readingTimeFromContent(content: string): string {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return `${Math.max(1, Math.round(words / 200))} min read`;
}

function normalizeDate(value: unknown): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "string" && value.length >= 10) {
    return value.slice(0, 10);
  }
  throw new Error(`Invalid blog date: ${String(value)}`);
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function parseFeaturedImage(value: unknown): FeaturedImage {
  if (!value || typeof value !== "object") {
    throw new Error("Post is missing featuredImage");
  }
  const img = value as Record<string, unknown>;
  if (typeof img.src !== "string" || typeof img.alt !== "string") {
    throw new Error("featuredImage requires src and alt strings");
  }
  const width = Number(img.width);
  const height = Number(img.height);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error("featuredImage requires numeric width and height");
  }
  return { src: img.src, alt: img.alt, width, height };
}

function toPost(slug: string, data: Record<string, unknown>, content: string): BlogPost {
  if (typeof data.title !== "string" || typeof data.description !== "string") {
    throw new Error(`Post "${slug}" is missing title or description`);
  }
  return {
    slug,
    title: data.title,
    description: data.description,
    date: normalizeDate(data.date),
    author: typeof data.author === "string" ? data.author : "",
    categories: asStringArray(data.categories),
    tags: asStringArray(data.tags),
    featuredImage: parseFeaturedImage(data.featuredImage),
    readingTime: readingTimeFromContent(content),
  };
}

function readPostFile(slug: string): { post: BlogPost; source: string } | null {
  const filePath = path.join(BLOG_DIR, `${slug}.mdx`);
  if (!fs.existsSync(filePath)) return null;
  const source = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(source);
  return { post: toPost(slug, data, content), source };
}

/** Newest first. */
export function getAllPosts(): BlogPost[] {
  if (!fs.existsSync(BLOG_DIR)) return [];
  return fs
    .readdirSync(BLOG_DIR)
    .filter((name) => name.endsWith(".mdx"))
    .map((name) => {
      const slug = name.replace(/\.mdx$/, "");
      const parsed = readPostFile(slug);
      if (!parsed) throw new Error(`Failed to read blog post: ${slug}`);
      return parsed.post;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return readPostFile(slug)?.post;
}

/** Raw MDX source (frontmatter + body) for compileMDX. */
export function getPostSource(slug: string): string | null {
  return readPostFile(slug)?.source ?? null;
}

export function getAllCategories(): string[] {
  const categories = new Set<string>();
  for (const post of getAllPosts()) {
    for (const category of post.categories) categories.add(category);
  }
  return [...categories].sort((a, b) => a.localeCompare(b));
}

export function formatBlogDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}
