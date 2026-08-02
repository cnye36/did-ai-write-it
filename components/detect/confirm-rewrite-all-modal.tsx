"use client";

import { SparkleIcon } from "@phosphor-icons/react";
import { Modal } from "@/components/ui/modal";

export function ConfirmRewriteAllModal({
  open,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean;
  busy: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} className="max-w-sm">
      <div className="px-6 py-10 text-center sm:px-8">
        <span className="mx-auto inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
          <SparkleIcon size={22} weight="fill" />
        </span>
        <h2 className="mt-4 text-xl font-semibold tracking-tight">Rewrite the entire draft?</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This replaces everything in the editor, including any manual edits
          you have made, with one AI rewrite. You can still edit it afterward.
        </p>
        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="inline-flex w-full items-center justify-center rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Rewriting..." : "Rewrite everything"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-muted transition-colors hover:text-ink"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
