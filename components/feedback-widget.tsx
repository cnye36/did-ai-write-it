"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { BugIcon, ChatCircleTextIcon, PaperPlaneRightIcon } from "@phosphor-icons/react";
import posthog from "posthog-js";
import { Modal } from "@/components/ui/modal";
import type { FeedbackKind } from "@/lib/feedback";

const KIND_OPTIONS: { value: FeedbackKind; label: string; icon: typeof BugIcon }[] = [
  { value: "bug", label: "Report a bug", icon: BugIcon },
  { value: "feedback", label: "Share feedback", icon: ChatCircleTextIcon },
];

export function FeedbackWidget({
  onNavigate,
  collapsed = false,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("bug");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  function close() {
    setOpen(false);
    // Reset after the close animation finishes rather than mid-fade.
    setTimeout(() => {
      setKind("bug");
      setMessage("");
      setError(null);
      setSent(false);
    }, 200);
  }

  async function submit() {
    const trimmed = message.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, message: trimmed, pageUrl: pathname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send that.");
      posthog.capture("feedback_submitted", { kind });
      setSent(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not send that.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          onNavigate?.();
        }}
        aria-label={collapsed ? "Feedback" : undefined}
        title={collapsed ? "Feedback" : undefined}
        className={`flex items-center rounded-[10px] py-2 text-sm text-muted transition-colors hover:bg-surface hover:text-ink ${
          collapsed ? "justify-center px-2" : "gap-2 px-3"
        }`}
      >
        <ChatCircleTextIcon size={14} weight="bold" />
        {!collapsed && "Feedback"}
      </button>

      <Modal open={open} onClose={close} className="max-w-md">
        <div className="p-5">
          {sent ? (
            <div className="py-6 text-center">
              <div className="mx-auto flex size-11 items-center justify-center rounded-full bg-good-soft text-good">
                <PaperPlaneRightIcon size={20} weight="bold" />
              </div>
              <p className="mt-3 text-sm font-medium text-ink">Thanks, that&apos;s on its way.</p>
              <p className="mt-1 text-sm text-muted">We read every message.</p>
              <button
                type="button"
                onClick={close}
                className="mt-4 rounded-full border border-line px-4 py-1.5 text-sm text-muted transition-colors hover:text-ink"
              >
                Close
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-base font-semibold tracking-tight text-ink">Feedback</h2>
              <p className="mt-1 text-sm text-muted">Found a bug, or want to tell us something? This goes straight to the team.</p>

              <div className="mt-4 inline-flex rounded-full border border-line p-0.5">
                {KIND_OPTIONS.map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setKind(value)}
                    aria-pressed={kind === value}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                      kind === value ? "bg-accent text-accent-ink" : "text-faint hover:text-ink"
                    }`}
                  >
                    <Icon size={13} weight="bold" />
                    {label}
                  </button>
                ))}
              </div>

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                autoFocus
                placeholder={
                  kind === "bug"
                    ? "What happened, and what did you expect instead?"
                    : "What's on your mind?"
                }
                className="mt-4 w-full resize-none rounded-[10px] border border-line bg-surface p-3 text-sm leading-relaxed text-ink outline-none placeholder:text-faint focus:border-accent"
              />

              {error && <p className="mt-2 text-sm text-bad">{error}</p>}

              <button
                type="button"
                disabled={!message.trim() || busy}
                onClick={submit}
                className="mt-4 w-full rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy ? "Sending..." : "Send"}
              </button>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
