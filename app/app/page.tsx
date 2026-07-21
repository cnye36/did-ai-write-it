"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FingerprintIcon,
  PenNibIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import {
  loadProfile,
  loadDrafts,
  deleteDraft,
  FORMAT_LABELS,
  type VoiceProfile,
  type Draft,
} from "@/lib/voice";

export default function Dashboard() {
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function load() {
      setProfile(await loadProfile());
      setDrafts(await loadDrafts());
      setLoaded(true);
    }
    load();
  }, []);

  if (!loaded) {
    return (
      <div className="space-y-4">
        <div className="h-28 animate-pulse rounded-2xl border border-line bg-raised" />
        <div className="h-48 animate-pulse rounded-2xl border border-line bg-raised" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Studio</h1>
          <p className="mt-1 text-sm text-muted">
            {profile
              ? "Your voice is fingerprinted. Draft something."
              : "Start by teaching it your voice."}
          </p>
        </div>
        {profile && (
          <Link
            href="/app/write"
            className="rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
          >
            New draft
          </Link>
        )}
      </div>

      {profile ? (
        <div className="rounded-2xl border border-line bg-raised p-6">
          <div className="flex items-start gap-4">
            <span className="mt-0.5 inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <FingerprintIcon size={20} weight="bold" />
            </span>
            <div className="min-w-0">
              <h2 className="font-semibold tracking-tight">Your voice fingerprint</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">
                {profile.fingerprint.summary}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.fingerprint.signaturePhrases.slice(0, 5).map((p) => (
                  <span
                    key={p}
                    className="rounded-full border border-line px-3 py-1 text-xs text-muted"
                  >
                    {p}
                  </span>
                ))}
              </div>
              <Link
                href="/app/onboarding"
                className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
              >
                Rebuild from new samples
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-raised p-10 text-center">
          <span className="inline-flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
            <FingerprintIcon size={24} weight="bold" />
          </span>
          <h2 className="mt-4 text-lg font-semibold tracking-tight">No voice profile yet</h2>
          <p className="mx-auto mt-1 max-w-[40ch] text-sm leading-relaxed text-muted">
            Paste a few samples of your real writing and it builds the fingerprint
            every draft is written from.
          </p>
          <Link
            href="/app/onboarding"
            className="mt-5 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
          >
            Build my voice profile
          </Link>
        </div>
      )}

      <div>
        <h2 className="text-lg font-semibold tracking-tight">Drafts</h2>
        {drafts.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-line p-8 text-center">
            <span className="inline-flex size-10 items-center justify-center rounded-full border border-line text-muted">
              <PenNibIcon size={18} weight="bold" />
            </span>
            <p className="mt-3 text-sm text-muted">
              Nothing here yet. Drafts you save in the editor appear here.
            </p>
          </div>
        ) : (
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {drafts.map((d) => (
              <li key={d.id} className="group rounded-2xl border border-line bg-raised p-5">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/app/write?draft=${d.id}`} className="min-w-0">
                    <p className="truncate font-medium tracking-tight hover:underline">
                      {d.title || "Untitled"}
                    </p>
                    <p className="mt-1 text-xs text-faint">
                      {FORMAT_LABELS[d.format]} ·{" "}
                      {new Date(d.updatedAt).toLocaleDateString()}
                    </p>
                  </Link>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 font-mono text-xs tabular-nums ${
                        d.score >= 70
                          ? "bg-good-soft text-good"
                          : d.score >= 45
                            ? "bg-warn-soft text-warn"
                            : "bg-bad-soft text-bad"
                      }`}
                    >
                      {d.score}
                    </span>
                    <button
                      type="button"
                      aria-label={`Delete draft ${d.title || "Untitled"}`}
                      onClick={() => {
                        deleteDraft(d.id);
                        setDrafts(loadDrafts());
                      }}
                      className="text-faint opacity-0 transition-opacity hover:text-bad group-hover:opacity-100"
                    >
                      <TrashIcon size={16} />
                    </button>
                  </div>
                </div>
                <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted">
                  {d.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
