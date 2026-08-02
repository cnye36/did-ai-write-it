import type { ReactNode } from "react";
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
          <section className="border-b border-line py-10 md:py-14">
            <Reveal>
              <Link
                href="/blog"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition-colors hover:text-ink"
              >
                <ArrowLeftIcon size={14} weight="bold" />
                Blog
              </Link>
              <h1 className="mt-5 max-w-[26ch] text-4xl font-semibold leading-[1.05] tracking-tighter md:text-5xl">
                {post.title}
              </h1>
              <p className="mt-4 max-w-[58ch] text-lg leading-relaxed text-muted">
                {post.excerpt}
              </p>
              <div className="mt-5 flex items-center gap-3 text-sm text-faint">
                <span className="rounded-full border border-line px-2.5 py-1 text-xs font-medium text-muted">
                  {post.category}
                </span>
                <time dateTime={post.date}>{formatBlogDate(post.date)}</time>
                <span className="flex items-center gap-1">
                  <ClockIcon size={14} />
                  {post.readingTime}
                </span>
              </div>
            </Reveal>
          </section>

          <Reveal>
            <div className="mx-auto max-w-[70ch] space-y-5 py-12 text-[17px] leading-relaxed text-muted md:py-16 [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-line [&_blockquote]:pl-5 [&_blockquote]:not-italic [&_blockquote]:text-ink [&_h2]:pt-4 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:text-ink [&_li]:leading-relaxed [&_strong]:font-medium [&_strong]:text-ink [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
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
