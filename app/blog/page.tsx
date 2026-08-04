import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRightIcon, ClockIcon } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { BlogCategoryFilter } from "@/components/marketing/blog-category-filter";
import { Reveal } from "@/components/ui/reveal";
import { formatBlogDate, getAllCategories, getAllPosts } from "@/lib/blog";

const TITLE = "Blog";
const DESCRIPTION =
  "Writing on AI detection, plagiarism, and what it actually takes to trust a piece of text.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/blog" },
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { category: rawCategory } = await searchParams;
  const categories = getAllCategories();
  const activeCategory =
    rawCategory && categories.includes(rawCategory) ? rawCategory : null;
  const posts = getAllPosts().filter(
    (post) => !activeCategory || post.categories.includes(activeCategory),
  );

  return (
    <>
      <SiteHeader
        navLinks={
          <Link href="/pricing" className="hidden text-sm text-muted transition-colors hover:text-ink sm:block">
            Pricing
          </Link>
        }
      />

      <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
        <section className="border-b border-line py-10 md:py-14">
          <Reveal>
            <h1 className="text-4xl font-semibold leading-[1.05] tracking-tighter md:text-5xl">
              Blog
            </h1>
            <p className="mt-4 max-w-[52ch] text-lg leading-relaxed text-muted">
              {DESCRIPTION}
            </p>
            <div className="mt-8">
              <BlogCategoryFilter categories={categories} active={activeCategory} />
            </div>
          </Reveal>
        </section>

        <section className="py-10 md:py-14">
          {posts.length === 0 ? (
            <p className="text-muted">No posts in this category yet.</p>
          ) : (
            <div className="space-y-4">
              {posts.map((post, i) => (
                <Reveal key={post.slug} delay={i * 0.05}>
                  <Link
                    href={`/blog/${post.slug}`}
                    className="group grid gap-5 rounded-2xl border border-line p-5 transition-colors hover:border-accent sm:grid-cols-[200px_1fr] sm:p-6"
                  >
                    <Image
                      src={post.featuredImage.src}
                      alt={post.featuredImage.alt}
                      width={post.featuredImage.width}
                      height={post.featuredImage.height}
                      className="aspect-[4/3] h-full w-full rounded-[10px] object-cover"
                      sizes="200px"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs text-faint">
                        {post.categories.map((category) => (
                          <span
                            key={category}
                            className="rounded-full border border-line px-2.5 py-1 font-medium text-muted"
                          >
                            {category}
                          </span>
                        ))}
                        <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                        <span className="flex items-center gap-1">
                          <ClockIcon size={13} />
                          {post.readingTime}
                        </span>
                      </div>
                      <h2 className="mt-4 max-w-[36ch] text-xl font-semibold tracking-tight md:text-2xl">
                        {post.title}
                      </h2>
                      <p className="mt-2 max-w-[62ch] leading-relaxed text-muted">
                        {post.description}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                        Read the post
                        <ArrowRightIcon
                          size={16}
                          weight="bold"
                          className="transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </div>
                  </Link>
                </Reveal>
              ))}
            </div>
          )}
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
