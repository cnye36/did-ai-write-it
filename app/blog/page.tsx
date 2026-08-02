import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, ClockIcon } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { Reveal } from "@/components/ui/reveal";
import { BLOG_POSTS, formatBlogDate } from "@/lib/blog";

const TITLE = "Blog";
const DESCRIPTION =
  "Writing on AI detection, plagiarism, and what it actually takes to trust a piece of text.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/blog" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/blog" },
};

export default function BlogIndexPage() {
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
          </Reveal>
        </section>

        <section className="py-10 md:py-14">
          <div className="space-y-4">
            {BLOG_POSTS.map((post, i) => (
              <Reveal key={post.slug} delay={i * 0.05}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block rounded-2xl border border-line p-6 transition-colors hover:border-accent sm:p-8"
                >
                  <div className="flex items-center gap-3 text-xs text-faint">
                    <span className="rounded-full border border-line px-2.5 py-1 font-medium text-muted">
                      {post.category}
                    </span>
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
                    {post.excerpt}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink">
                    Read the post
                    <ArrowRightIcon
                      size={16}
                      weight="bold"
                      className="transition-transform group-hover:translate-x-0.5"
                    />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
