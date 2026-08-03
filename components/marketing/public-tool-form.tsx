"use client";

import { useMemo, useRef, useState } from "react";
import { ClipboardTextIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { countWords, verdictFor } from "@/lib/detector";
import { saveCheckHandoff, type CheckKind } from "@/lib/handoff";
import {
  FACT_CHECK_MAX_CHARS,
  FACT_CHECK_MIN_CHARS,
  PLAGIARISM_MAX_CHARS,
  PLAGIARISM_MIN_CHARS,
} from "@/lib/winston";
import { Modal } from "@/components/ui/modal";
import { ScoreGauge } from "@/components/detect/score-gauge";
import { WinstonSentenceList, type WinstonSentence } from "@/components/detect/winston-sentence-list";
import posthog from "posthog-js";

const FREE_WORD_LIMIT = 300;

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
  const [preview, setPreview] = useState<{ score: number; sentences: WinstonSentence[] } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const copy = TOOL_COPY[kind];
  const words = useMemo(() => countWords(text), [text]);
  const chars = text.trim().length;
  const minChars = kind === "plagiarism" ? PLAGIARISM_MIN_CHARS : FACT_CHECK_MIN_CHARS;
  const maxChars = kind === "plagiarism" ? PLAGIARISM_MAX_CHARS : FACT_CHECK_MAX_CHARS;
  const canSubmit =
    kind === "detect"
      ? words >= 15
      : chars >= minChars && chars <= maxChars;

  function continueToSignup() {
    posthog.capture("public_check_started", { check_kind: kind, destination: "signup" });
    saveCheckHandoff({ text, kind });
    window.location.assign(signupHref(copy.route));
  }

  function onUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    void file.text().then((contents) => setText(contents.slice(0, 150_000)));
  }

  async function submit() {
    setError(null);
    setRateLimited(false);

    if (kind !== "detect" || words > FREE_WORD_LIMIT) {
      continueToSignup();
      return;
    }

    posthog.capture("public_check_started", { check_kind: kind, destination: "preview" });
    setBusy(true);
    setPreview(null);
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

  const overFreeLimit = kind === "detect" && words > FREE_WORD_LIMIT;

  return (
    <>
      <div className="rounded-2xl border border-line bg-raised p-3 shadow-[0_24px_80px_-32px_rgba(20,20,45,0.28)] dark:shadow-none sm:p-4">
        <div className="flex items-center justify-between gap-3 border-b border-line px-1 pb-3">
          <span className="inline-flex items-center gap-2 text-sm font-medium">
            <ClipboardTextIcon size={17} weight="bold" className="text-accent" />
            {copy.label}
          </span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            <UploadSimpleIcon size={15} weight="bold" />
            Upload .txt
          </button>
          <input ref={fileRef} type="file" accept=".txt,.md,.text" onChange={onUpload} className="hidden" />
        </div>
        <div className="pt-3">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            aria-label={copy.label}
            placeholder={copy.placeholder}
            className="w-full resize-none bg-transparent text-sm leading-relaxed text-ink outline-none placeholder:text-faint"
          />
          <div className="mt-3 flex flex-col gap-3 border-t border-line pt-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-xs text-faint">
              {kind === "detect" ? (
                <span className={`font-mono tabular-nums ${overFreeLimit ? "text-accent" : ""}`}>
                  {words.toLocaleString()} words
                  {overFreeLimit ? " · Sign up free for this full check" : " · Free up to 300 words"}
                </span>
              ) : (
                <span className="font-mono tabular-nums">
                  {chars.toLocaleString()} / {maxChars.toLocaleString()} characters
                  {chars < minChars ? ` · Needs at least ${minChars.toLocaleString()}` : ""}
                </span>
              )}
              {fileName && <span className="ml-3">{fileName}</span>}
            </div>
            <button
              type="button"
              disabled={!canSubmit || busy}
              onClick={submit}
              className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {busy ? "Checking..." : overFreeLimit ? "Sign up to check" : copy.cta}
            </button>
          </div>
        </div>
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="grid max-h-[85vh] grid-cols-1 sm:grid-cols-[1.3fr_1fr]">
          <div className="max-h-[40vh] overflow-y-auto border-b border-line p-5 sm:max-h-[85vh] sm:border-b-0 sm:border-r">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">Your text</p>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted">{text}</div>
          </div>
          <div className="flex flex-col p-5">
            <p className="mb-4 text-xs font-medium uppercase tracking-wide text-faint">Your score</p>
            {busy ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => <div key={i} className="h-4 animate-pulse rounded bg-line" />)}
              </div>
            ) : preview ? (
              <>
                <ScoreGauge score={preview.score} verdict={verdictFor(preview.score)} size={92} />
                <span className="mt-1 text-[11px] text-faint">Powered by Winston AI</span>
                <div className="mt-4">
                  <WinstonSentenceList
                    sentences={preview.sentences}
                    revealCount={1}
                    ctaHref={signupHref(copy.route)}
                    onSignup={continueToSignup}
                  />
                </div>
              </>
            ) : (
              <p className="text-sm text-muted">This check is unavailable right now. Try again shortly.</p>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}
