"use client";

import { useRef, useState } from "react";
import { ClipboardTextIcon, UploadSimpleIcon } from "@phosphor-icons/react";
import { DETECTOR_SAMPLES, type SampleId } from "@/lib/detector-samples";

type Tab = "paste" | "upload";

/**
 * The paste/upload box every public check shares: the homepage hero and each
 * tool landing page, so the two never drift apart. The footer (word or
 * character count and the submit button) differs per check and is passed in as
 * children.
 */
export function CheckInput({
  value,
  onChange,
  ariaLabel,
  placeholder,
  note,
  fileName,
  onUpload,
  onSelectSample,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  ariaLabel: string;
  placeholder: string;
  /** Small line under the tabs, e.g. the daily free-check allowance. */
  note?: string;
  fileName?: string | null;
  onUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  /** Omit to hide the sample chips (only the AI detector has samples). */
  onSelectSample?: (id: SampleId) => void;
  children: React.ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("paste");
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <>
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

      {note && (
        <p className="mt-2 px-1 text-center text-[11px] text-faint sm:text-left">{note}</p>
      )}

      <div className="mt-3 rounded-2xl border border-line bg-surface p-4">
        <div className="relative">
          <textarea
            value={value}
            onChange={(event) => onChange(event.target.value)}
            rows={9}
            aria-label={ariaLabel}
            placeholder={placeholder}
            className="w-full resize-y bg-transparent text-sm leading-relaxed text-ink outline-none placeholder:text-faint"
          />
          {/* Left-aligned so the chips clear the textarea's resize grip. */}
          {onSelectSample && !value && (
            <div className="pointer-events-none absolute inset-x-0 bottom-1 flex justify-start">
              <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-raised px-1 py-1 shadow-sm">
                <span className="pl-2 text-[11px] text-faint">Try a sample</span>
                {(Object.keys(DETECTOR_SAMPLES) as SampleId[]).map((id) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onSelectSample(id)}
                    className="rounded-full px-2.5 py-1 text-[11px] font-medium text-muted transition-colors hover:bg-accent/10 hover:text-accent"
                  >
                    {DETECTOR_SAMPLES[id].label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
          {children}
        </div>
        {fileName && (
          <p className="mt-2 truncate text-xs text-faint">{fileName}</p>
        )}
      </div>
    </>
  );
}
