"use client";

import { useRef, useState } from "react";
import { UploadSimpleIcon } from "@phosphor-icons/react";

const ACCEPT = ".txt,.md,.csv,.pdf,.docx";

export function UploadTextButton({
  onText,
  onError,
  disabled,
}: {
  onText: (text: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const name = file.name.toLowerCase();
    if (name.endsWith(".txt") || name.endsWith(".md")) {
      onText(await file.text());
      return;
    }
    if (!name.endsWith(".pdf") && !name.endsWith(".docx")) {
      onError("Upload a .txt, .md, .pdf, or .docx file.");
      return;
    }

    setBusy(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/parse-document", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't read that file.");
      onText(data.text as string);
    } catch (err) {
      onError(err instanceof Error ? err.message : "Couldn't read that file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input ref={fileRef} type="file" accept={ACCEPT} onChange={handleChange} className="hidden" />
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => fileRef.current?.click()}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted transition-colors hover:border-faint hover:text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        <UploadSimpleIcon size={14} weight="bold" />
        {busy ? "Reading..." : "Upload file"}
      </button>
    </>
  );
}
