"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ClipboardTextIcon,
  UploadSimpleIcon,
  LockSimpleIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { analyzeText, verdictFor } from "@/lib/detector";
import { HANDOFF_KEY } from "@/lib/handoff";
import { ScoreGauge } from "./score-gauge";
import { WinstonSentenceList, type WinstonSentence } from "./winston-sentence-list";
import { Modal } from "./modal";

const SAMPLE = `In today's fast-paced digital landscape, leveraging AI has become crucial for success. It is not just about working harder, it is about working smarter. Businesses must delve into these cutting-edge tools to unlock their full potential. Furthermore, this seamless integration fosters innovation, efficiency, and growth. Companies that embrace this robust technology will elevate their content to new heights. Moreover, it is a testament to how far automation has come. The results speak for themselves, and the future looks incredibly bright. Ultimately, this powerful shift will revolutionize the way we work — forever.`;

const FREE_PREVIEW = { revealCount: 1, ctaHref: "/signup" };
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
    file.text().then((t) => {
      setText(t.slice(0, 12000));
    });
  }

  async function analyze() {
    setPreviewError(null);
    setRateLimited(false);
    setPreview(null);
    setBusy(true);
    setModalOpen(true);
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
          onChange={(e) => setText(e.target.value)}
          rows={9}
          aria-label="Text to check for AI"
          placeholder="Paste AI-generated text here to see how detectable it is..."
          className="w-full resize-none bg-transparent text-sm leading-relaxed text-ink outline-none placeholder:text-faint"
        />
        <div className="mt-2 flex items-center justify-between border-t border-line pt-3">
          <div className="flex items-center gap-3 text-xs text-faint">
            <span className="font-mono tabular-nums">{words} words</span>
            {words > MAX_SCAN_WORDS && <span>(scoring first {MAX_SCAN_WORDS})</span>}
            {fileName && <span className="max-w-[140px] truncate">{fileName}</span>}
            {!text && (
              <button
                type="button"
                onClick={() => setText(SAMPLE)}
                className="text-accent hover:underline"
              >
                Try a sample
              </button>
            )}
          </div>
          <button
            type="button"
            disabled={!canCheck || busy}
            onClick={analyze}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Checking..." : "Analyze"}
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

      {/* Locked signup row */}
      <div className="mt-3 flex flex-col items-center justify-between gap-3 rounded-2xl border border-dashed border-line bg-surface px-4 py-3 sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <LockSimpleIcon size={18} weight="bold" />
          </span>
          <p className="text-sm leading-snug text-muted">
            <span className="font-medium text-ink">Get unlimited Winston checks</span> and the
            full report. Free account, no card.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-1.5 sm:items-end">
          <Link
            href="/app/detect"
            onClick={() => {
              if (text.trim()) sessionStorage.setItem(HANDOFF_KEY, text);
            }}
            className="inline-flex items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
          >
            Sign up free for unlimited checks <ArrowRightIcon size={15} weight="bold" />
          </Link>
          <Link
            href="/app/humanize"
            onClick={() => {
              if (text.trim()) sessionStorage.setItem(HANDOFF_KEY, text);
            }}
            className="text-xs font-medium text-muted transition-colors hover:text-ink"
          >
            or humanize it instead
          </Link>
        </div>
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
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-medium uppercase tracking-wide text-faint">
                Verified score
              </p>
              <span className="text-xs text-faint">Powered by Winston AI</span>
            </div>
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
                <div className="flex items-center gap-4">
                  <ScoreGauge score={preview.score} verdict={verdictFor(preview.score)} size={92} />
                </div>
                {preview.sentences.length > 0 && (
                  <div className="mt-4">
                    <WinstonSentenceList
                      sentences={preview.sentences}
                      revealCount={FREE_PREVIEW.revealCount}
                      ctaHref={FREE_PREVIEW.ctaHref}
                    />
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-muted">
                Winston check unavailable for this text right now. Try again shortly.
              </p>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
