"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDownIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { docToExportBlocks } from "@/lib/editor-export";

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "draft";
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Downloads the current draft as a real .docx or .pdf, generated entirely
 *  client-side (docx and jsPDF are lazy-loaded on click, not bundled into
 *  the editor page's initial load). Mirrors the outside-click/Escape
 *  dropdown pattern already used by `FilterMenu` in
 *  `components/ui/app-sidebar.tsx`. */
export function ExportMenu({ getDoc, title }: { getDoc: () => object; title: string }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<"docx" | "pdf" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function exportDocx() {
    setBusy("docx");
    setError(null);
    try {
      const { blocksToDocxBlob } = await import("@/lib/editor-export-docx");
      const blob = await blocksToDocxBlob(docToExportBlocks(getDoc()));
      downloadBlob(blob, `${slugify(title)}.docx`);
      setOpen(false);
    } catch {
      setError("Could not create the .docx file.");
    } finally {
      setBusy(null);
    }
  }

  async function exportPdf() {
    setBusy("pdf");
    setError(null);
    try {
      const { blocksToPdfBlob } = await import("@/lib/editor-export-pdf");
      const blob = blocksToPdfBlob(docToExportBlocks(getDoc()));
      downloadBlob(blob, `${slugify(title)}.pdf`);
      setOpen(false);
    } catch {
      setError("Could not create the .pdf file.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink transition-colors hover:border-faint"
      >
        <DownloadSimpleIcon size={13} weight="bold" />
        Export
        <CaretDownIcon size={11} weight="bold" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-9 z-20 w-48 overflow-hidden rounded-[10px] border border-line bg-raised shadow-xl"
        >
          <button
            type="button"
            role="menuitem"
            disabled={busy !== null}
            onClick={exportDocx}
            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download as DOCX
            {busy === "docx" && <span className="text-xs text-faint">...</span>}
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy !== null}
            onClick={exportPdf}
            className="flex w-full items-center justify-between border-t border-line px-3 py-2 text-left text-sm text-muted transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
          >
            Download as PDF
            {busy === "pdf" && <span className="text-xs text-faint">...</span>}
          </button>
          {error && <p className="border-t border-line px-3 py-2 text-xs text-bad">{error}</p>}
        </div>
      )}
    </div>
  );
}
