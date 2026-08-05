"use client";

import {
  ArrowRightIcon,
  CheckIcon,
  LockSimpleIcon,
} from "@phosphor-icons/react";
import type {
  FactCheckClaim,
  PlagiarismMatch,
  PlagiarismSource,
} from "@/lib/winston";
import {
  factCheckVerdict,
  plagiarismVerdict,
} from "@/lib/score-verdicts";
import { Gauge } from "@/components/ui/gauge";
import { FactCheckClaims } from "@/components/fact-check/fact-check-claims";
import { FactCheckHighlightedText } from "@/components/fact-check/fact-check-highlighted-text";
import { PlagiarismHighlightedText } from "@/components/plagiarism/plagiarism-highlighted-text";
import { PlagiarismSources } from "@/components/plagiarism/plagiarism-sources";

type GatedKind = "plagiarism" | "fact_check";

const PLAGIARISM_TEXT =
  "A clear content review starts with knowing where each idea came from. Matching passages are highlighted in the draft, then connected to the pages where similar wording appears. This makes it easier to verify quotations, add missing attribution, and revise language that is too close to an existing source.";

function matchFor(phrase: string): PlagiarismMatch {
  const startIndex = PLAGIARISM_TEXT.indexOf(phrase);
  return { startIndex, endIndex: startIndex + phrase.length };
}

const PLAGIARISM_MATCHES = [
  matchFor("Matching passages are highlighted in the draft"),
  matchFor("add missing attribution"),
];

const PLAGIARISM_SOURCES: PlagiarismSource[] = [
  {
    url: "",
    title: "Original article",
    score: 22,
    plagiarismWords: 9,
    totalNumberOfWords: 684,
    author: null,
    publishedDate: null,
  },
  {
    url: "",
    title: "Reference guide",
    score: 11,
    plagiarismWords: 3,
    totalNumberOfWords: 421,
    author: null,
    publishedDate: null,
  },
];

const FACT_CHECK_TEXT =
  "The Eiffel Tower opened to the public in 1889 for the Paris World's Fair. It is more than 400 meters tall. The tower was intended to stand for only twenty years, but it remained useful for radio transmission. Today it is one of the most visited paid monuments in the world.";

const FACT_CHECK_CLAIMS: FactCheckClaim[] = [
  {
    sentence:
      "The Eiffel Tower opened to the public in 1889 for the Paris World's Fair.",
    claim: "The Eiffel Tower opened in 1889 for the Paris World's Fair.",
    verdict: "SUPPORTED",
    score: 96,
    explanation:
      "Historical records support both the opening year and its role in the 1889 Exposition Universelle.",
    links: [],
  },
  {
    sentence: "It is more than 400 meters tall.",
    claim: "The Eiffel Tower is more than 400 meters tall.",
    verdict: "REFUTED",
    score: 8,
    explanation:
      "The tower is about 330 meters tall including antennas, not more than 400 meters.",
    links: [],
  },
  {
    sentence:
      "The tower was intended to stand for only twenty years, but it remained useful for radio transmission.",
    claim:
      "The Eiffel Tower was planned as a temporary structure and later used for radio transmission.",
    verdict: "SUPPORTED",
    score: 93,
    explanation:
      "The original concession was temporary, and its communications value helped preserve the structure.",
    links: [],
  },
];

const BENEFITS: Record<GatedKind, string[]> = {
  plagiarism: [
    "Matched wording highlighted in context",
    "Source links and overlap percentages",
    "A saved report you can reopen later",
  ],
  fact_check: [
    "A verdict for each checkable claim",
    "Explanations and supporting sources",
    "A saved report you can reopen later",
  ],
};

export function GatedToolPreview({
  kind,
  onSignup,
}: {
  kind: GatedKind;
  onSignup: () => void;
}) {
  const plagiarism = kind === "plagiarism";
  const score = plagiarism ? 18 : 66;
  const verdict = plagiarism
    ? plagiarismVerdict(score)
    : factCheckVerdict(score);

  return (
    <div className="flex max-h-[88vh] flex-col">
      <div className="border-b border-line px-5 py-4 pr-16">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
            Example report
          </span>
          <span className="text-xs text-faint">No check has run yet</span>
        </div>
        <h2 className="mt-2 text-lg font-semibold tracking-tight text-ink">
          See what your complete {plagiarism ? "plagiarism" : "fact-check"} report includes
        </h2>
      </div>

      <div className="grid min-h-0 flex-1 overflow-y-auto md:grid-cols-[1.05fr_0.95fr] md:overflow-hidden">
        <section className="border-b border-line p-5 md:overflow-y-auto md:border-b-0 md:border-r">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">
            Example text
          </p>
          {plagiarism ? (
            <>
              <PlagiarismHighlightedText
                text={PLAGIARISM_TEXT}
                matches={PLAGIARISM_MATCHES}
              />
              <div className="mt-4 flex items-center gap-2 text-xs text-muted">
                <span className="h-3 w-3 rounded-sm bg-bad-soft" aria-hidden />
                Matching wording
              </div>
            </>
          ) : (
            <>
              <FactCheckHighlightedText
                text={FACT_CHECK_TEXT}
                claims={FACT_CHECK_CLAIMS}
              />
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted">
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-good-soft" aria-hidden />
                  Supported
                </span>
                <span className="inline-flex items-center gap-2">
                  <span className="h-3 w-3 rounded-sm bg-bad-soft" aria-hidden />
                  Refuted
                </span>
              </div>
            </>
          )}
        </section>

        <section className="p-5 md:overflow-y-auto">
          <div className="flex items-start justify-between gap-4 pr-8">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-faint">
                Example score
              </p>
              <p className="mt-1 text-xs leading-relaxed text-muted">
                {plagiarism
                  ? "Lower means less matching text."
                  : "Higher means stronger source support."}
              </p>
            </div>
            <Gauge
              score={score}
              color={verdict.color}
              label={verdict.label}
              size={82}
            />
          </div>

          <div className="mt-5">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">
              {plagiarism ? "Matching sources" : "Checked claims"}
            </p>
            {plagiarism ? (
              <PlagiarismSources sources={PLAGIARISM_SOURCES} />
            ) : (
              <FactCheckClaims claims={FACT_CHECK_CLAIMS.slice(0, 2)} />
            )}
          </div>
        </section>
      </div>

      <div className="border-t border-line bg-surface p-4 sm:flex sm:items-center sm:justify-between sm:gap-5">
        <div>
          <p className="flex items-center gap-2 text-sm font-medium text-ink">
            <LockSimpleIcon size={16} weight="bold" className="text-accent" />
            Your text is ready to check
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {BENEFITS[kind].map((benefit) => (
              <li
                key={benefit}
                className="inline-flex items-center gap-1 text-xs text-muted"
              >
                <CheckIcon size={12} weight="bold" className="text-accent" />
                {benefit}
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={onSignup}
          className="mt-4 inline-flex w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] sm:mt-0 sm:w-auto"
        >
          Sign up free to check
          <ArrowRightIcon size={14} weight="bold" />
        </button>
      </div>
    </div>
  );
}
