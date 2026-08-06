"use client";

import { useEffect, useState } from "react";
import { CheckIcon, CopySimpleIcon, LinkBreakIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import { Modal } from "@/components/ui/modal";

/** Share/revoke controls for one run, opened from the report's button row.
 *  Fetches its own share status independently of the report-loading path
 *  (result/version state in the parent), so it's a pure addition with no risk
 *  to the existing report data flow. */
export function ShareReportButton({ runId }: { runId: string }) {
  const [open, setOpen] = useState(false);
  const [shareToken, setShareToken] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || shareToken !== undefined) return;
    (async () => {
      try {
        const res = await fetch(`/api/runs/${runId}/share`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error ?? "Could not load share status.");
        setShareToken(data.shareToken as string | null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not load share status.");
      }
    })();
  }, [open, shareToken, runId]);

  async function createLink() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/runs/${runId}/share`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create share link.");
      setShareToken(data.shareToken as string);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create share link.");
    } finally {
      setBusy(false);
    }
  }

  async function stopSharing() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/runs/${runId}/share`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not turn off sharing.");
      setShareToken(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not turn off sharing.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    if (!shareToken) return;
    await navigator.clipboard.writeText(`${window.location.origin}/share/${shareToken}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:border-faint"
      >
        <ShareNetworkIcon size={16} weight="bold" />
        Share
      </button>

      <Modal open={open} onClose={() => setOpen(false)} className="max-w-md">
        <div className="p-6">
          <h2 className="text-lg font-semibold tracking-tight">Share this report</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted">
            Anyone with the link can view a read-only copy of this score and highlighted text.
            No sign-in, no editing.
          </p>

          {error && <p className="mt-4 rounded-[10px] bg-bad-soft px-3 py-2 text-sm text-bad">{error}</p>}

          {shareToken ? (
            <div className="mt-5 space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${shareToken}`}
                  className="min-w-0 flex-1 rounded-[10px] border border-line bg-surface px-3 py-2 text-sm text-muted"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <button
                  type="button"
                  onClick={copyLink}
                  aria-label="Copy link"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3 py-2 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
                >
                  {copied ? <CheckIcon size={15} weight="bold" /> : <CopySimpleIcon size={15} weight="bold" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={stopSharing}
                className="inline-flex items-center gap-2 text-sm text-bad transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <LinkBreakIcon size={14} weight="bold" />
                Stop sharing
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={busy || shareToken === undefined}
              onClick={createLink}
              className="mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ShareNetworkIcon size={16} weight="bold" />
              {busy ? "Creating link..." : "Create shareable link"}
            </button>
          )}
        </div>
      </Modal>
    </>
  );
}
