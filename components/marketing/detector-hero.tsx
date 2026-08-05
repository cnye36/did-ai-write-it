"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRightIcon } from "@phosphor-icons/react";
import { analyzeText } from "@/lib/detector";
import { DETECTOR_SAMPLES, type SampleId } from "@/lib/detector-samples";
import { saveCheckHandoff } from "@/lib/handoff";
import { MIN_WORDS_FOR_CHECK, WORD_COUNT_HELP_TEXT } from "@/lib/winston";
import { InfoTooltip } from "@/components/ui/info-tooltip";
import type { WinstonSentence } from "@/components/detect/winston-sentence-list";
import { CheckInput } from "@/components/marketing/check-input";
import { PreviewReport } from "@/components/marketing/preview-report";
import { Modal } from "@/components/ui/modal";

/** Keep in sync with MAX_WORDS in app/api/preview-detect/route.ts. */
const MAX_SCAN_WORDS = 500;
/** Keep in sync with DAILY_LIMIT in app/api/preview-detect/route.ts. */
const DAILY_FREE_CHECKS = 3;

export function DetectorHero() {
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [activeSample, setActiveSample] = useState<SampleId | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{
    score: number;
    sentences: WinstonSentence[];
    totalSentenceCount?: number;
  } | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const words = useMemo(() => analyzeText(text).wordCount, [text]);
  // Samples are pre-scored canned demos, not a live check on unreliable
  // short text, so they're exempt from the word floor below.
  const canCheck = activeSample !== null || words >= MIN_WORDS_FOR_CHECK;

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setActiveSample(null);
    file.text().then((t) => {
      setText(t.slice(0, 12000));
    });
  }

  function selectSample(id: SampleId) {
    setText(DETECTOR_SAMPLES[id].text);
    setActiveSample(id);
  }

  async function analyze() {
    setPreviewError(null);
    setRateLimited(false);
    setPreview(null);

    // Demo samples are pre-scored against the real detector, so reuse that
    // score instead of spending a live API call and a rate-limit slot on a
    // known result. Checked before the word ceiling below, since a canned
    // result costs nothing to serve however long the sample is. Still shows
    // the same "checking" delay as a real request.
    if (activeSample) {
      const { winston } = DETECTOR_SAMPLES[activeSample];
      setBusy(true);
      setModalOpen(true);
      setTimeout(() => {
        setPreview(winston);
        setBusy(false);
      }, 700);
      return;
    }

    if (words > MAX_SCAN_WORDS) {
      saveCheckHandoff({ text, kind: "detect" });
      window.location.assign(`/signup?next=${encodeURIComponent("/app/detect?autorun=1")}`);
      return;
    }

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
    } catch (e) {
      setModalOpen(false);
      setPreviewError(e instanceof Error ? e.message : "Check failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-3xl border border-line bg-raised p-3 shadow-[0_24px_80px_-32px_rgba(20,20,45,0.28)] dark:shadow-none sm:p-4">
      <CheckInput
        value={text}
        onChange={(value) => {
          setText(value);
          setActiveSample(null);
        }}
        ariaLabel="Text to check for AI"
        placeholder="Paste AI-generated text here to see how detectable it is..."
        note={`${DAILY_FREE_CHECKS} free checks per day`}
        fileName={fileName}
        onUpload={onUpload}
        onSelectSample={selectSample}
      >
        <div className="flex items-center gap-3 text-xs text-faint">
          <span
            className={`font-mono tabular-nums ${words > MAX_SCAN_WORDS ? "text-accent" : ""}`}
          >
            {words.toLocaleString()} words
            {activeSample
              ? " · Sample text"
              : words < MIN_WORDS_FOR_CHECK
                ? ` · ${MIN_WORDS_FOR_CHECK} words min, up to ${MAX_SCAN_WORDS} free`
                : words > MAX_SCAN_WORDS
                  ? " · Sign up free for this full check"
                  : ` · Free up to ${MAX_SCAN_WORDS} words`}
          </span>
          <InfoTooltip text={WORD_COUNT_HELP_TEXT} />
        </div>
        <button
          type="button"
          disabled={!canCheck || busy}
          onClick={analyze}
          className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Checking..." : !activeSample && words > MAX_SCAN_WORDS ? "Sign up to check" : "Analyze"}
        </button>
      </CheckInput>

      {previewError && <p className="mt-2 text-xs text-bad">{previewError}</p>}
      {rateLimited && (
        <div className="mt-3 flex flex-col items-center justify-between gap-3 rounded-2xl border border-line bg-warn-soft px-4 py-3 sm:flex-row">
          <p className="text-sm leading-snug text-ink">
            You have used your free checks for today. Sign up free to keep going.
          </p>
          <Link
            href="/signup"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
          >
            Sign up free
          </Link>
        </div>
      )}

      {/* Soft signup nudge, kept low-key so the checker itself still reads as free */}
      <div className="mt-3 flex justify-center sm:justify-end">
        <Link
          href={`/signup?next=${encodeURIComponent("/app/detect?autorun=1")}`}
          onClick={() => {
            if (text.trim()) saveCheckHandoff({ text, kind: "detect" });
          }}
          className="inline-flex items-center gap-1 text-xs font-medium text-muted transition-colors hover:text-ink"
        >
          Sign up for detailed reports <ArrowRightIcon size={12} weight="bold" />
        </Link>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <PreviewReport
          text={text}
          busy={busy}
          preview={preview}
          ctaHref={`/signup?next=${encodeURIComponent("/app/detect?autorun=1")}`}
          onSignup={() => saveCheckHandoff({ text, kind: "detect" })}
        />
      </Modal>
    </div>
  );
}
