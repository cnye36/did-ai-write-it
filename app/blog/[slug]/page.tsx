import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import { BlogPostLayout } from "@/components/marketing/blog-post-layout";
import { mdxComponents } from "@/components/marketing/mdx-components";
import {
  getAllPosts,
  getPostBySlug,
  getPostSource,
  type BlogFrontmatter,
} from "@/lib/blog";
import { jsonLdScriptProps, SITE_URL } from "@/lib/seo";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.description,
      url: `/blog/${post.slug}`,
      type: "article",
      publishedTime: post.date,
      images: [
        {
          url: post.featuredImage.src,
          width: post.featuredImage.width,
          height: post.featuredImage.height,
          alt: post.featuredImage.alt,
        },
      ],
    },
  };
}

export default async function BlogPostPage({ params }: PageProps) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const source = getPostSource(slug);
  if (!post || !source) notFound();

  const { content } = await compileMDX<BlogFrontmatter>({
    source,
    options: { parseFrontmatter: true },
    components: mdxComponents,
  });

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    dateModified: post.date,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    image: [`${SITE_URL}${post.featuredImage.src}`],
    ...(post.author
      ? { author: { "@type": "Person", name: post.author } }
      : {}),
  };

  return (
    <>
      <script {...jsonLdScriptProps(articleJsonLd)} />
      <BlogPostLayout post={post}>{content}</BlogPostLayout>
    </>
  );
}
