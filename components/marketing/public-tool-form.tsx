"use client";

import { useMemo, useState } from "react";
import { countWords } from "@/lib/detector";
import { DETECTOR_SAMPLES, type SampleId } from "@/lib/detector-samples";
import { saveCheckHandoff, type CheckKind } from "@/lib/handoff";
import {
  MIN_WORDS_FOR_CHECK,
  WORD_COUNT_HELP_TEXT,
} from "@/lib/winston";
import { Modal } from "@/components/ui/modal";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { WinstonSentence } from "@/components/detect/winston-sentence-list";
import { CheckInput } from "@/components/marketing/check-input";
import { GatedToolPreview } from "@/components/marketing/gated-tool-preview";
import { PreviewReport } from "@/components/marketing/preview-report";
import posthog from "posthog-js";

/** Keep in sync with MAX_WORDS in app/api/preview-detect/route.ts. */
const FREE_WORD_LIMIT = 500;
/** Keep in sync with DAILY_LIMIT in app/api/preview-detect/route.ts. */
const DAILY_FREE_CHECKS = 3;

const TOOL_COPY: Record<
  CheckKind,
  { label: string; placeholder: string; cta: string; route: string }
> = {
  detect: {
    label: "AI detector",
    placeholder: "Paste text to see whether it reads as AI-generated...",
    cta: "Check for AI",
    route: "/app/detect?autorun=1",
  },
  plagiarism: {
    label: "Plagiarism checker",
    placeholder: "Paste text to scan for matching sources...",
    cta: "Check for plagiarism",
    route: "/app/plagiarism?autorun=1",
  },
  fact_check: {
    label: "Fact checker",
    placeholder: "Paste text to check its factual claims against sources...",
    cta: "Check claims",
    route: "/app/fact-check?autorun=1",
  },
};

function signupHref(next: string): string {
  return `/signup?next=${encodeURIComponent(next)}`;
}

export function PublicToolForm({ kind }: { kind: CheckKind }) {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);
  const [preview, setPreview] = useState<{
    score: number;
    sentences: WinstonSentence[];
    totalSentenceCount?: number;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeSample, setActiveSample] = useState<SampleId | null>(null);
  const copy = TOOL_COPY[kind];
  const words = useMemo(() => countWords(text), [text]);
  const canSubmit =
    kind === "detect"
      ? activeSample !== null || words >= MIN_WORDS_FOR_CHECK
      : words >= MIN_WORDS_FOR_CHECK;

  function continueToSignup() {
    posthog.capture("public_check_started", { check_kind: kind, destination: "signup" });
    saveCheckHandoff({ text, kind });
    window.location.assign(signupHref(copy.route));
  }

  function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setActiveSample(null);
    void file.text().then((contents) => setText(contents.slice(0, 150_000)));
  }

  function selectSample(id: SampleId) {
    setText(DETECTOR_SAMPLES[id].text);
    setActiveSample(id);
  }

  async function submit() {
    setError(null);
    setRateLimited(false);
    setPreview(null);

    // Pre-scored demo text, so show the stored result rather than spending a
    // live check and one of the visitor's daily slots on a known answer.
    if (activeSample) {
      posthog.capture("public_check_started", { check_kind: kind, destination: "sample" });
      const { winston } = DETECTOR_SAMPLES[activeSample];
      setBusy(true);
      setModalOpen(true);
      setTimeout(() => {
        setPreview(winston);
        setBusy(false);
      }, 700);
      return;
    }

    if (kind !== "detect") {
      posthog.capture("public_check_started", {
        check_kind: kind,
        destination: "example_report",
      });
      setModalOpen(true);
      return;
    }

    if (words > FREE_WORD_LIMIT) {
      continueToSignup();
      return;
    }

    posthog.capture("public_check_started", { check_kind: kind, destination: "preview" });
    setBusy(true);
    setModalOpen(true);
    try {
      const res = await fetch("/api/preview-detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (res.status === 429) {
        setModalOpen(false);
        setRateLimited(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Check failed.");
      setPreview(data.winston);
    } catch (cause) {
      setModalOpen(false);
      setError(cause instanceof Error ? cause.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  }

  // A sample is served from its stored result, so its length never pushes the
  // visitor toward signup the way a long pasted draft does.
  const overFreeLimit = kind === "detect" && !activeSample && words > FREE_WORD_LIMIT;

  return (
    <>
      <div className="rounded-2xl border border-line bg-raised p-3 shadow-[0_24px_80px_-32px_rgba(20,20,45,0.28)] dark:shadow-none sm:p-4">
        <CheckInput
          value={text}
          onChange={(value) => {
            setText(value);
            setActiveSample(null);
          }}
          ariaLabel={copy.label}
          placeholder={copy.placeholder}
          note={
            kind === "detect"
              ? `${DAILY_FREE_CHECKS} free checks per day · ${MIN_WORDS_FOR_CHECK}-${FREE_WORD_LIMIT} words per check`
              : undefined
          }
          fileName={fileName}
          onUpload={onUpload}
          onSelectSample={kind === "detect" ? selectSample : undefined}
        >
          <div className="flex items-center gap-2 text-xs text-faint">
            {kind === "detect" ? (
              <span className={`font-mono tabular-nums ${overFreeLimit ? "text-accent" : ""}`}>
                {words.toLocaleString()} words
                {activeSample
                  ? " · Sample text"
                  : words < MIN_WORDS_FOR_CHECK
                    ? ` · ${MIN_WORDS_FOR_CHECK} words min, up to ${FREE_WORD_LIMIT} free`
                    : overFreeLimit
                      ? " · Sign up free for this full check"
                      : ` · Free up to ${FREE_WORD_LIMIT} words`}
              </span>
            ) : (
              <span className="font-mono tabular-nums">
                {words.toLocaleString()} words · {MIN_WORDS_FOR_CHECK} word min
              </span>
            )}
            <InfoTooltip text={WORD_COUNT_HELP_TEXT} />
          </div>
          <button
            type="button"
            disabled={!canSubmit || busy}
            onClick={submit}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Checking..." : overFreeLimit ? "Sign up to check" : copy.cta}
          </button>
        </CheckInput>
        {error && <p className="mt-3 text-sm text-bad">{error}</p>}
        {rateLimited && (
          <div className="mt-3 flex flex-col gap-3 rounded-[10px] bg-warn-soft p-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink">You have used today’s free AI checks. Sign up to continue.</p>
            <button type="button" onClick={continueToSignup} className="text-sm font-medium text-accent hover:underline">
              Sign up free
            </button>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        className={kind === "detect" ? undefined : "max-w-5xl"}
      >
        {kind === "detect" ? (
          <PreviewReport
            text={text}
            busy={busy}
            preview={preview}
            ctaHref={signupHref(copy.route)}
            onSignup={continueToSignup}
          />
        ) : (
          <GatedToolPreview kind={kind} onSignup={continueToSignup} />
        )}
      </Modal>
    </>
  );
}
