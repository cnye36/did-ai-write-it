"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ClipboardTextIcon,
  UploadSimpleIcon,
  LockSimpleIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { analyzeText } from "@/lib/detector";
import { HANDOFF_KEY } from "@/lib/handoff";
import { ScoreGauge } from "./score-gauge";
import { DetectionReportBody, countHiddenFlagged } from "./detection-report";
import { Modal } from "./modal";

const SAMPLE = `In today's fast-paced digital landscape, leveraging AI has become crucial for success. It is not just about working harder, it is about working smarter. Businesses must delve into these cutting-edge tools to unlock their full potential. Furthermore, this seamless integration fosters innovation, efficiency, and growth. Companies that embrace this robust technology will elevate their content to new heights. Moreover, it is a testament to how far automation has come. The results speak for themselves, and the future looks incredibly bright. Ultimately, this powerful shift will revolutionize the way we work — forever.`;

const FREE_PREVIEW = { revealCount: 1, ctaHref: "/signup" };

type Tab = "paste" | "upload";

export function HumanizerHero() {
  const [tab, setTab] = useState<Tab>("paste");
  const [text, setText] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const result = useMemo(() => analyzeText(text), [text]);
  const words = result.wordCount;
  const canCheck = words >= 15;
  const hiddenCount = countHiddenFlagged(result, FREE_PREVIEW.revealCount);

  function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    file.text().then((t) => {
      setText(t.slice(0, 12000));
    });
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
            disabled={!canCheck}
            onClick={() => setModalOpen(true)}
            className="rounded-full bg-accent px-5 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            Analyze
          </button>
        </div>
      </div>

      {/* Locked humanize row */}
      <div className="mt-3 flex flex-col items-center justify-between gap-3 rounded-2xl border border-dashed border-line bg-surface px-4 py-3 sm:flex-row">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
            <LockSimpleIcon size={18} weight="bold" />
          </span>
          <p className="text-sm leading-snug text-muted">
            <span className="font-medium text-ink">Rewrite it to read human</span> and see the
            full breakdown. Free account, no card.
          </p>
        </div>
        <Link
          href="/app/humanize"
          onClick={() => {
            if (text.trim()) sessionStorage.setItem(HANDOFF_KEY, text);
          }}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
        >
          Humanize free <ArrowRightIcon size={15} weight="bold" />
        </Link>
      </div>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)}>
        <div className="grid max-h-[85vh] grid-cols-1 sm:grid-cols-[1.3fr_1fr]">
          {/* Text, scrollable, fixed height */}
          <div className="max-h-[40vh] overflow-y-auto border-b border-line p-5 sm:max-h-[85vh] sm:border-b-0 sm:border-r">
            <p className="mb-3 text-xs font-medium uppercase tracking-wide text-faint">
              Your text
            </p>
            <DetectionReportBody text={text} result={result} freePreview={FREE_PREVIEW} />
          </div>

          {/* Score, never scrolls, CTA always visible */}
          <div className="flex flex-col p-5">
            <div className="flex items-center gap-4">
              <ScoreGauge score={100 - result.score} verdict={result.verdict} size={92} />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-faint">Likely AI-written</p>
                <p className="font-mono text-2xl font-semibold tabular-nums">
                  {100 - result.score}%
                </p>
              </div>
            </div>
            <ul className="mt-4 space-y-1.5">
              {result.metrics.map((m) => (
                <li key={m.id} className="flex items-center gap-2 text-xs">
                  <span className="w-20 shrink-0 text-muted">{m.label}</span>
                  <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
                    <span
                      className="block h-full rounded-full"
                      style={{
                        width: `${m.score}%`,
                        background:
                          m.score >= 70
                            ? "var(--good)"
                            : m.score >= 45
                              ? "var(--warn)"
                              : "var(--bad)",
                      }}
                    />
                  </span>
                </li>
              ))}
            </ul>
            {hiddenCount > 0 && (
              <div className="mt-auto flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line bg-surface p-4 pt-6 text-center">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-accent-soft text-accent">
                  <LockSimpleIcon size={18} weight="bold" />
                </span>
                <p className="text-sm text-muted">
                  {hiddenCount} more flagged sentence{hiddenCount > 1 ? "s" : ""} hidden.
                </p>
                <Link
                  href={FREE_PREVIEW.ctaHref}
                  className="rounded-full bg-accent px-4 py-2 text-xs font-medium text-accent-ink transition-transform active:scale-[0.97]"
                >
                  Sign up free to see the full report
                </Link>
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
