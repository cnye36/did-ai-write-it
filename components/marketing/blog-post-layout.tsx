import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeftIcon, ClockIcon } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { CtaPanel } from "@/components/marketing/cta-panel";
import { Reveal } from "@/components/ui/reveal";
import { formatBlogDate, type BlogPost } from "@/lib/blog";

export function BlogPostLayout({
  post,
  children,
}: {
  post: BlogPost;
  children: ReactNode;
}) {
  return (
    <>
      <SiteHeader
        navLinks={
          <>
            <Link href="/blog" className="hidden text-sm text-muted transition-colors hover:text-ink sm:block">
              Blog
            </Link>
            <Link href="/pricing" className="hidden text-sm text-muted transition-colors hover:text-ink sm:block">
              Pricing
            </Link>
          </>
        }
      />

      <div className="mx-auto w-full max-w-[1160px] px-4 sm:px-6">
        <article>
          <div className="pt-10 md:pt-14">
            <Reveal>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
              >
                <ArrowLeftIcon size={14} weight="bold" />
                Blog
              </Link>
            </Reveal>

            <Reveal delay={0.05}>
              <div className="mt-5 aspect-video w-full overflow-hidden rounded-2xl border border-line">
                <Image
                  src={post.featuredImage.src}
                  alt={post.featuredImage.alt}
                  width={post.featuredImage.width}
                  height={post.featuredImage.height}
                  className="h-full w-full object-cover"
                  sizes="(max-width: 1160px) 100vw, 1160px"
                  priority
                />
              </div>
            </Reveal>
          </div>

          <section className="border-b border-line pb-10 pt-8 md:pb-14">
            <Reveal delay={0.1}>
              <h1 className="max-w-[26ch] text-4xl font-semibold leading-[1.05] tracking-tighter md:text-5xl">
                {post.title}
              </h1>
              <p className="mt-4 max-w-[58ch] text-lg leading-relaxed text-muted">
                {post.description}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-faint">
                {post.categories.map((category) => (
                  <Link
                    key={category}
                    href={`/blog?category=${encodeURIComponent(category)}`}
                    className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted transition-colors hover:border-accent hover:text-ink"
                  >
                    {category}
                  </Link>
                ))}
                <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                <span className="flex items-center gap-1">
                  <ClockIcon size={14} />
                  {post.readingTime}
                </span>
                {post.author ? <span>By {post.author}</span> : null}
              </div>
              {post.tags.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-raised px-2.5 py-1 text-xs text-faint"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </Reveal>
          </section>

          <Reveal amount={0}>
            <div className="mx-auto max-w-[70ch] space-y-5 py-12 text-[17px] leading-relaxed text-muted md:py-16">
              {children}
            </div>
          </Reveal>
        </article>

        <section className="border-t border-line py-20 md:py-28">
          <Reveal>
            <CtaPanel
              heading="See what a real detector says about your draft."
              body="Paste any text and get a verified score, sentence by sentence, with the reasoning behind every flag."
            />
          </Reveal>
        </section>

        <SiteFooter />
      </div>
    </>
  );
}
