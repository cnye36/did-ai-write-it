"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ClipboardTextIcon,
  UploadSimpleIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { analyzeText, verdictFor } from "@/lib/detector";
import { saveCheckHandoff } from "@/lib/handoff";
import { ScoreGauge } from "@/components/detect/score-gauge";
import { WinstonSentenceList, type WinstonSentence } from "@/components/detect/winston-sentence-list";
import { Modal } from "@/components/ui/modal";

type SampleId = "ai" | "mixed" | "human";

/**
 * Pre-scored against the real Winston API once; reused verbatim so the demo
 * samples never spend a live API call or a rate-limit slot on a known result.
 */
const SAMPLES: Record<
  SampleId,
  { label: string; text: string; winston: { score: number; sentences: WinstonSentence[] } }
> = {
  ai: {
    label: "AI",
    text: `In today's fast-paced digital landscape, leveraging AI has become crucial for success. It is not just about working harder, it is about working smarter. Businesses must delve into these cutting-edge tools to unlock their full potential. Furthermore, this seamless integration fosters innovation, efficiency, and growth. Companies that embrace this robust technology will elevate their content to new heights. Moreover, it is a testament to how far automation has come. The results speak for themselves, and the future looks incredibly bright. Ultimately, this powerful shift will revolutionize the way we work — forever.`,
    winston: {
      score: 4,
      sentences: [
        { text: "In today's fast-paced digital landscape, leveraging AI has become crucial for success.", score: 2 },
        { text: "It is not just about working harder, it is about working smarter.", score: 6 },
        { text: "Businesses must delve into these cutting-edge tools to unlock their full potential.", score: 3 },
        { text: "Furthermore, this seamless integration fosters innovation, efficiency, and growth.", score: 1 },
        { text: "Companies that embrace this robust technology will elevate their content to new heights.", score: 5 },
        { text: "Moreover, it is a testament to how far automation has come.", score: 8 },
        { text: "The results speak for themselves, and the future looks incredibly bright.", score: 4 },
        { text: "Ultimately, this powerful shift will revolutionize the way we work — forever.", score: 3 },
      ],
    },
  },
  mixed: {
    label: "Mixed",
    text: `The first step to being ahead of the game in today's rapidly evolving tech world is to integrate AI into your business. Simply putting in more hours and more hard work will not achieve this. If you want your business to grow, you will need to adopt this technology. Companies that invest in new technology will see improvement to their operations because automation has come a long way. We are undoubtedly at the dawn of a new age of work, and the potential is limitless.`,
    winston: {
      score: 57,
      sentences: [
        { text: "The first step to being ahead of the game in today's rapidly evolving tech world is to integrate AI into your business.", score: 48 },
        { text: "Simply putting in more hours and more hard work will not achieve this.", score: 82 },
        { text: "If you want your business to grow, you will need to adopt this technology.", score: 60 },
        { text: "Companies that invest in new technology will see improvement to their operations because automation has come a long way.", score: 52 },
        { text: "We are undoubtedly at the dawn of a new age of work, and the potential is limitless.", score: 43 },
      ],
    },
  },
  human: {
    label: "Human",
    text: `With technology developing at an unprecedented pace, it has become imperative to capitalize on the use of AI in this modern-day era. This is not merely hard work; it is smart work. Organizations have to get down to business in using these technologies and harnessing their full strength. Additionally, this smooth transition brings with itself innovation, efficiency, and growth. Those companies who choose to use this technology will take their content to a whole new level. Lastly, it is yet another example of how far automation technology has come.`,
    winston: {
      score: 99,
      sentences: [
        { text: "With technology developing at an unprecedented pace, it has become imperative to capitalize on the use of AI in this modern-day era.", score: 95 },
        { text: "This is not merely hard work; it is smart work.", score: 100 },
        { text: "Organizations have to get down to business in using these technologies and harnessing their full strength.", score: 99 },
        { text: "Additionally, this smooth transition brings with itself innovation, efficiency, and growth.", score: 100 },
        { text: "Those companies who choose to use this technology will take their content to a whole new level.", score: 100 },
        { text: "Lastly, it is yet another example of how far automation technology has come.", score: 100 },
      ],
    },
  },
};

const FREE_PREVIEW = { revealCount: 1 };
const MAX_SCAN_WORDS = 300;

type Tab = "paste" | "upload";

function firstWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  return words.slice(0, maxWords).join(" ");
}

export function DetectorHero() {
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [activeSample, setActiveSample] = useState<SampleId | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ score: number; sentences: WinstonSentence[] } | null>(
    null
  );
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [rateLimited, setRateLimited] = useState(false);

  const words = useMemo(() => analyzeText(text).wordCount, [text]);
  const canCheck = words >= 15;
  const scannedText = useMemo(() => firstWords(text, MAX_SCAN_WORDS), [text]);

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
    setText(SAMPLES[id].text);
    setActiveSample(id);
  }

  async function analyze() {
    if (words > MAX_SCAN_WORDS) {
      saveCheckHandoff({ text, kind: "detect" });
      window.location.assign(`/signup?next=${encodeURIComponent("/app/detect?autorun=1")}`);
      return;
    }

    setPreviewError(null);
    setRateLimited(false);
    setPreview(null);
    setBusy(true);
    setModalOpen(true);

    // Demo samples are pre-scored against the real detector, so reuse that
    // score instead of spending a live API call and a rate-limit slot on a
    // known result. Still shows the same "checking" delay as a real request.
    if (activeSample) {
      const { winston } = SAMPLES[activeSample];
      setTimeout(() => {
        setPreview(winston);
        setBusy(false);
      }, 700);
      return;
    }

    try {
      const res = await fetch("/api/preview-detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: scannedText }),
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
      {/* Tabs */}
      <div className="flex items-center gap-1 rounded-full bg-surface p-1">
        <button
          type="button"
          onClick={() => setTab("paste")}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === "paste" ? "bg-raised text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          <ClipboardTextIcon size={16} weight="bold" /> Paste text
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("upload");
            fileRef.current?.click();
          }}
          className={`inline-flex flex-1 items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
            tab === "upload" ? "bg-raised text-ink shadow-sm" : "text-muted hover:text-ink"
          }`}
        >
          <UploadSimpleIcon size={16} weight="bold" /> Upload file
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.text"
          onChange={onUpload}
          className="hidden"
        />
      </div>

      {/* Input */}
      <div className="mt-3 rounded-2xl border border-line bg-surface p-4">
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActiveSample(null);
          }}
          rows={9}
          aria-label="Text to check for AI"
          placeholder="Paste AI-generated text here to see how detectable it is..."
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-ink outline-none placeholder:text-faint"
        />
        <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
          <div className="flex items-center gap-3 text-xs text-faint">
            <span
              className={`font-mono tabular-nums ${words >= MAX_SCAN_WORDS ? "text-accent" : ""}`}
            >
              {words.toLocaleString()} words{words > MAX_SCAN_WORDS ? " · Sign up free for this full check" : ` · Free up to ${MAX_SCAN_WORDS}`}
            </span>
            {fileName && <span className="max-w-[140px] truncate">{fileName}</span>}
            {!text && (
              <span className="flex items-center gap-2">
                Try a sample:
                {(Object.keys(SAMPLES) as SampleId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => selectSample(id)}
                    className="text-accent hover:underline"
                  >
                    {SAMPLES[id].label}
                  </button>
                ))}
              </span>
            )}
          </div>
          <button
            type="button"
            disabled={!canCheck || busy}
            onClick={analyze}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Checking..." : words > MAX_SCAN_WORDS ? "Sign up to check" : "Analyze"}
          </button>
        </div>
      </div>

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
        <div className="grid max-h-[85vh] grid-cols-1 sm:grid-cols-[1.3fr_1fr]">
          {/* Text, scrollable, fixed height */}
          <div className="max-h-[40vh] overflow-y-auto border-b border-line p-5 sm:max-h-[85vh] sm:border-b-0 sm:border-r">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">
              Your text
            </p>
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted">
              {scannedText}
            </div>
          </div>

          {/* Score, never scrolls, CTA always visible */}
          <div className="flex flex-col p-5">
            <p className="mb-4 text-xs font-medium uppercase tracking-wide text-faint">
              Your score
            </p>
            {busy ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-4 animate-pulse rounded bg-line"
                    style={{ width: `${80 - i * 10}%` }}
                  />
                ))}
              </div>
            ) : preview ? (
              <>
                <div className="flex flex-col items-start gap-1">
                  <ScoreGauge score={preview.score} verdict={verdictFor(preview.score)} size={92} />
                  <span className="text-[11px] text-faint">Powered by Winston AI</span>
                </div>
                {preview.sentences.length > 0 && (
                  <div className="mt-4">
                    <WinstonSentenceList
                      sentences={preview.sentences}
                      revealCount={FREE_PREVIEW.revealCount}
                      ctaHref={`/signup?next=${encodeURIComponent("/app/detect?autorun=1")}`}
                      onSignup={() => saveCheckHandoff({ text, kind: "detect" })}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">
                Check unavailable for this text right now. Try again shortly.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
