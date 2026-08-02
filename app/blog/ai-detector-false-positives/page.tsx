import type { Metadata } from "next";
import { BlogPostLayout } from "@/components/marketing/blog-post-layout";
import { getPostBySlug } from "@/lib/blog";
import { jsonLdScriptProps } from "@/lib/seo";

const post = getPostBySlug("ai-detector-false-positives")!;

export const metadata: Metadata = {
  title: post.title,
  description: post.description,
  alternates: { canonical: `/blog/${post.slug}` },
  openGraph: {
    title: post.title,
    description: post.description,
    url: `/blog/${post.slug}`,
    type: "article",
    publishedTime: post.date,
  },
};

const ARTICLE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post.title,
  description: post.description,
  datePublished: post.date,
  dateModified: post.date,
  mainEntityOfPage: `https://www.didaiwriteit.com/blog/${post.slug}`,
};

export default function FalsePositivesPost() {
  return (
    <>
      <script {...jsonLdScriptProps(ARTICLE_JSON_LD)} />
      <BlogPostLayout post={post}>
        <p>
          A student turns in an essay they wrote themselves and gets called
          into a meeting about academic dishonesty. A freelance writer submits
          a piece and the client refuses to pay because a scanner flagged it
          as machine-generated. A non-native English speaker polishes a cover
          letter, careful and correct, and a hiring tool quietly moves it to
          the bottom of the pile. None of these people used AI. All of them
          were told, by a number on a screen, that they had.
        </p>
        <p>
          This is the false positive problem, and it is the most serious
          criticism leveled at AI detectors since the category existed. A
          detector that misses AI writing is a missed catch. A detector that
          flags human writing as AI-generated makes an accusation, and
          accusations have consequences that a wrong score cannot undo.
        </p>

        <h2>What a false positive actually is</h2>
        <p>
          A false positive is any case where a detector scores genuinely
          human-written text as AI-generated. It is different from a detector
          simply being uncertain. Most detectors return a single number, and
          a confident-looking number invites a confident-sounding
          conclusion, even when the underlying signal is weak. The problem
          is not that detectors are wrong sometimes. Every statistical model
          is wrong sometimes. The problem is that a wrongly high score gets
          treated as proof, in a setting (a classroom, a job application, a
          client relationship) where the accused rarely gets a fair chance to
          push back.
        </p>

        <h2>Why detectors get it wrong</h2>
        <p>
          Most AI detectors work by measuring how predictable a piece of
          writing is. Language models tend to pick likely next words. Humans
          are messier: we vary sentence length, break grammar rules on
          purpose, and repeat ourselves in ways a model usually smooths
          over. Detectors are built to notice the difference. The trouble is
          that plenty of human writing is also predictable, for reasons that
          have nothing to do with AI.
        </p>
        <ul>
          <li>
            <strong>Formulaic writing.</strong> Five-paragraph essays, legal
            boilerplate, technical documentation, and standardized test
            responses are all trained into people through years of
            schooling. That training produces exactly the kind of uniform,
            low-surprise sentence structure detectors are built to catch.
          </li>
          <li>
            <strong>Short text.</strong> A two-sentence product description
            or a single paragraph does not give a detector enough signal to
            work with. Every major detector, ours included, is far less
            reliable under a few hundred words, and most say so plainly if
            you read the fine print.
          </li>
          <li>
            <strong>Second-language writing.</strong> This is the sharpest
            edge of the problem. Someone who learned English as a second
            language, especially through formal instruction, tends to write
            with simpler grammar and a narrower, more common vocabulary than
            a native speaker writing casually. That is precisely the pattern
            a detector reads as machine-generated.
          </li>
        </ul>

        <div className="rounded-2xl bg-accent-soft p-6 sm:p-8">
          <p className="text-ink">
            In a widely cited 2023 study, Stanford researchers ran a set of
            real TOEFL essays, written by non-native English speakers, through
            several popular GPT detectors. More than half of the essays were
            wrongly flagged as AI-generated. One detector flagged nearly all
            of them.
          </p>
        </div>

        <h2>Two moments that made this a public fight</h2>
        <p>
          The false positive problem stopped being a niche complaint and
          became a public controversy through two events in 2023.
        </p>
        <p>
          First, OpenAI shut down its own AI text classifier only six months
          after launching it, citing a low accuracy rate. If the company that
          built ChatGPT could not build a reliable detector for its own
          model&apos;s output, that was a signal worth taking seriously.
        </p>
        <p>
          Second, Turnitin rolled its AI-writing indicator out to thousands
          of schools and universities at once, scanning the work of millions
          of students by default. Instructors got a percentage next to each
          paper with limited explanation of how it was calculated. Reports of
          students wrongly accused, some able to prove their innocence and
          some not, drew coverage across mainstream outlets throughout the
          year and turned the accuracy question into a public debate rather
          than an academic one.
        </p>

        <h2>What is actually at stake</h2>
        <p>
          A false positive is not an abstract statistic when it lands on a
          real person. A student can face a formal academic integrity
          hearing over an essay they wrote alone. A job applicant can be
          filtered out before a human ever reads their resume. A freelancer
          can lose an invoice, and the relationship with the client that came
          with it, over a single score neither side fully understands. In
          every one of those cases, the burden of proof falls on the accused,
          who is being asked to prove a negative against a tool that
          presented its guess as a fact.
        </p>

        <h2>How to read a score without turning it into a verdict</h2>
        <p>
          None of this means detection is useless. It means a score is a
          starting point for a conversation, not the end of one. A few habits
          make the difference:
        </p>
        <ul>
          <li>
            <strong>Read the reasoning, not just the number.</strong> A good
            detector shows why a sentence was flagged. If the only evidence
            is an unexplained percentage, treat it with more suspicion, not
            less.
          </li>
          <li>
            <strong>Weight short and formulaic text less.</strong> A two
            paragraph email and a five thousand word report do not deserve
            the same confidence from the same score.
          </li>
          <li>
            <strong>Consider who wrote it.</strong> If a writer is working in
            a second language, in a heavily templated format, or under a
            strict style guide, a high score is weaker evidence than it looks.
          </li>
          <li>
            <strong>Never accuse on a score alone.</strong> Ask for drafts,
            revision history, or a conversation about the work before treating
            a number as settled.
          </li>
        </ul>
        <p>
          This is also why every score on this site comes with the sentence
          it is attached to and the reasoning behind the flag, checked
          against a real third-party detector rather than a guess. No
          detector, including this one, is certain on every input. Treat the
          score as a signal worth investigating, especially on a short
          draft, and you will get far more use out of it than treating it as
          a verdict.
        </p>
      </BlogPostLayout>
    </>
  );
}
