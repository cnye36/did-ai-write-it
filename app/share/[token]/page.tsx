import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarBlankIcon, LockSimpleIcon } from "@phosphor-icons/react/dist/ssr";
import { SiteHeader } from "@/components/marketing/site-header";
import { SiteFooter } from "@/components/marketing/site-footer";
import { createServiceClient } from "@/lib/supabase/service";
import { formatRunDateTime, RUN_KIND_LABEL } from "@/lib/runs";
import type { DetectRunResult, FactCheckRunResult, PlagiarismRunResult, RunKind } from "@/lib/runs";
import { verdictFor } from "@/lib/detector";
import { plagiarismVerdict, factCheckVerdict } from "@/lib/score-verdicts";
import { ScoreGauge } from "@/components/detect/score-gauge";
import { Gauge } from "@/components/ui/gauge";
import { WinstonHighlightedText } from "@/components/detect/winston-highlighted-text";
import { PlagiarismHighlightedText } from "@/components/plagiarism/plagiarism-highlighted-text";
import { PlagiarismSources } from "@/components/plagiarism/plagiarism-sources";
import { FactCheckHighlightedText } from "@/components/fact-check/fact-check-highlighted-text";
import { FactCheckClaims } from "@/components/fact-check/fact-check-claims";

export const metadata: Metadata = {
  title: "Shared report",
  robots: { index: false, follow: false },
};

interface SharedRun {
  id: string;
  kind: RunKind;
  title: string;
  input_text: string;
  word_count: number;
  score: number | null;
  result: DetectRunResult | PlagiarismRunResult | FactCheckRunResult;
  created_at: string;
}

async function loadSharedRun(token: string): Promise<SharedRun | null> {
  const supabase = createServiceClient();
  const { data, error } = await supabase
    .from("runs")
    .select("id, kind, title, input_text, word_count, score, result, created_at")
    .eq("share_token", token)
    .maybeSingle();

  if (error) {
    console.error("Failed to load shared report:", error.message);
    return null;
  }
  return data as SharedRun | null;
}

function ReportBody({ run }: { run: SharedRun }) {
  if (run.kind === "detect") {
    const { winston } = run.result as DetectRunResult;
    const verdict = verdictFor(winston.score);
    return (
      <>
        <div className="flex items-center gap-4">
          <ScoreGauge score={winston.score} verdict={verdict} size={72} />
          <div>
            <p className="text-sm font-semibold">AI-detection score</p>
            <p className="mt-0.5 text-xs text-faint">{run.word_count.toLocaleString()} words</p>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <WinstonHighlightedText text={run.input_text} sentences={winston.sentences} showHuman />
        </div>
      </>
    );
  }

  if (run.kind === "plagiarism") {
    const { plagiarism } = run.result as PlagiarismRunResult;
    const verdict = plagiarismVerdict(plagiarism.score);
    return (
      <>
        <div className="flex items-center gap-4">
          <Gauge score={plagiarism.score} color={verdict.color} label={verdict.label} size={72} />
          <div>
            <p className="text-sm font-semibold">Plagiarism score</p>
            <p className="mt-0.5 text-xs text-faint">
              {plagiarism.totalPlagiarismWords.toLocaleString()} of{" "}
              {plagiarism.textWordCount.toLocaleString()} words matched
            </p>
          </div>
        </div>
        <div className="rounded-2xl border border-line bg-surface p-4">
          <PlagiarismHighlightedText text={run.input_text} matches={plagiarism.matches} />
        </div>
        {plagiarism.sources.length > 0 && (
          <div className="rounded-2xl border border-line bg-surface p-4">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">Matched sources</p>
            <PlagiarismSources sources={plagiarism.sources} />
          </div>
        )}
      </>
    );
  }

  const { factCheck } = run.result as FactCheckRunResult;
  const verdict = factCheckVerdict(factCheck.score);
  return (
    <>
      <div className="flex items-center gap-4">
        <Gauge score={factCheck.score} color={verdict.color} label={verdict.label} size={72} />
        <div>
          <p className="text-sm font-semibold">Fact-check score</p>
          <p className="mt-0.5 text-xs text-faint">
            {factCheck.claims.length} claim{factCheck.claims.length === 1 ? "" : "s"} checked
          </p>
        </div>
      </div>
      <div className="rounded-2xl border border-line bg-surface p-4">
        <FactCheckHighlightedText text={run.input_text} claims={factCheck.claims} />
      </div>
      {factCheck.claims.length > 0 && (
        <div className="rounded-2xl border border-line bg-surface p-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">Claims</p>
          <FactCheckClaims claims={factCheck.claims} />
        </div>
      )}
    </>
  );
}

export default async function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const run = await loadSharedRun(token);
  if (!run) notFound();

  return (
    <>
      <SiteHeader navLinks={null} />
      <main className="mx-auto w-full max-w-[900px] space-y-6 px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            <LockSimpleIcon size={13} weight="bold" />
            Shared {RUN_KIND_LABEL[run.kind]} report · read-only
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-faint">
            <CalendarBlankIcon size={13} weight="bold" />
            Checked {formatRunDateTime(run.created_at)}
          </span>
        </div>

        <h1 className="text-xl font-semibold leading-snug tracking-tight">{run.title}</h1>

        <div className="space-y-4">
          <ReportBody run={run} />
        </div>

        <div className="rounded-2xl border border-dashed border-line p-5 text-center">
          <p className="text-sm text-muted">Want a verified score for your own text?</p>
          <Link
            href="/"
            className="mt-3 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
          >
            Run your own check free
          </Link>
        </div>
      </main>
      <div className="mx-auto w-full max-w-[900px] px-4 sm:px-6">
        <SiteFooter />
      </div>
    </>
  );
}
