"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusIcon, XIcon } from "@phosphor-icons/react";
import {
  loadProfile,
  saveProfile,
  type VoiceFingerprint,
} from "@/lib/voice";

const MIN_SAMPLES = 3;
const MIN_WORDS = 60;

const wordCount = (s: string) => s.split(/\s+/).filter(Boolean).length;

export default function Onboarding() {
  const router = useRouter();
  const [samples, setSamples] = useState<string[]>(["", "", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fingerprint, setFingerprint] = useState<VoiceFingerprint | null>(null);

  useEffect(() => {
    const existing = loadProfile();
    if (existing) {
      setSamples(existing.samples);
      setFingerprint(existing.fingerprint);
    }
  }, []);

  const readySamples = samples.filter((s) => wordCount(s) >= MIN_WORDS);
  const canSubmit = readySamples.length >= MIN_SAMPLES && !busy;

  async function analyze() {
    setBusy(true);
    setError(null);
    setFingerprint(null);
    try {
      const res = await fetch("/api/analyze-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ samples: readySamples }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Analysis failed.");
      const fp = data.fingerprint as VoiceFingerprint;
      setFingerprint(fp);
      saveProfile({
        fingerprint: fp,
        samples: readySamples,
        createdAt: new Date().toISOString(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analysis failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Teach it your voice</h1>
        <p className="mt-1 max-w-[56ch] text-sm leading-relaxed text-muted">
          Paste at least {MIN_SAMPLES} pieces you actually wrote, {MIN_WORDS}+ words
          each. LinkedIn posts, newsletter issues, long emails. The more it sounds
          like you on a normal day, the better the fingerprint.
        </p>
      </div>

      <div className="space-y-4">
        {samples.map((sample, i) => {
          const wc = wordCount(sample);
          return (
            <div key={i} className="rounded-2xl border border-line bg-raised p-4">
              <div className="mb-2 flex items-center justify-between">
                <label htmlFor={`sample-${i}`} className="text-sm font-medium">
                  Sample {i + 1}
                </label>
                <div className="flex items-center gap-3">
                  <span
                    className={`font-mono text-xs tabular-nums ${
                      wc >= MIN_WORDS ? "text-good" : "text-faint"
                    }`}
                  >
                    {wc} words
                  </span>
                  {samples.length > MIN_SAMPLES && (
                    <button
                      type="button"
                      aria-label={`Remove sample ${i + 1}`}
                      onClick={() => setSamples(samples.filter((_, j) => j !== i))}
                      className="text-faint transition-colors hover:text-bad"
                    >
                      <XIcon size={14} weight="bold" />
                    </button>
                  )}
                </div>
              </div>
              <textarea
                id={`sample-${i}`}
                value={sample}
                onChange={(e) =>
                  setSamples(samples.map((s, j) => (j === i ? e.target.value : s)))
                }
                rows={5}
                placeholder="Paste something you wrote..."
                className="w-full resize-y rounded-[10px] border border-line bg-surface p-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-faint focus:border-accent"
              />
            </div>
          );
        })}
        {samples.length < 10 && (
          <button
            type="button"
            onClick={() => setSamples([...samples, ""])}
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium text-muted transition-colors hover:text-ink active:scale-[0.97]"
          >
            <PlusIcon size={14} weight="bold" /> Add another sample
          </button>
        )}
      </div>

      {error && (
        <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>
      )}

      <div className="flex items-center gap-4">
        <button
          type="button"
          disabled={!canSubmit}
          onClick={analyze}
          className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Reading your writing..." : fingerprint ? "Rebuild fingerprint" : "Build my fingerprint"}
        </button>
        {!canSubmit && !busy && (
          <p className="text-xs text-faint">
            {readySamples.length}/{MIN_SAMPLES} samples ready
          </p>
        )}
      </div>

      {busy && (
        <div className="space-y-3">
          <div className="h-24 animate-pulse rounded-2xl border border-line bg-raised" />
          <div className="h-24 animate-pulse rounded-2xl border border-line bg-raised" />
        </div>
      )}

      {fingerprint && !busy && (
        <div className="space-y-4 rounded-2xl border border-line bg-raised p-6">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Your fingerprint</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">{fingerprint.summary}</p>
          </div>
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-faint">Tone</dt>
              <dd className="mt-1 text-sm leading-relaxed">{fingerprint.tone}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-faint">Rhythm</dt>
              <dd className="mt-1 text-sm leading-relaxed">{fingerprint.sentenceRhythm}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-faint">Vocabulary</dt>
              <dd className="mt-1 text-sm leading-relaxed">{fingerprint.vocabulary}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-faint">Opinions</dt>
              <dd className="mt-1 text-sm leading-relaxed">{fingerprint.opinions}</dd>
            </div>
          </dl>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">
              Signature phrases
            </dt>
            <div className="mt-2 flex flex-wrap gap-2">
              {fingerprint.signaturePhrases.map((p) => (
                <span key={p} className="rounded-full border border-line px-3 py-1 text-xs">
                  {p}
                </span>
              ))}
            </div>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-faint">
              Never says
            </dt>
            <div className="mt-2 flex flex-wrap gap-2">
              {fingerprint.neverSays.map((p) => (
                <span
                  key={p}
                  className="rounded-full bg-bad-soft px-3 py-1 text-xs text-bad"
                >
                  {p}
                </span>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push("/app/write")}
            className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
          >
            Start writing
          </button>
        </div>
      )}
    </div>
  );
}
