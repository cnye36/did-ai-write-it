"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  SparkleIcon,
  CopyIcon,
  CheckIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { analyzeText, type MetricScore, type Verdict } from "@/lib/detector";
import { loadProfile, HANDOFF_KEY, type VoiceProfile } from "@/lib/voice";
import { ScoreGauge } from "@/components/score-gauge";

interface Summary {
  score: number;
  verdict: Verdict;
  metrics: MetricScore[];
}

interface PassRecord {
  pass: number;
  score: number;
  accepted: boolean;
  rejectedBecause?: string;
}

interface HumanizeResponse {
  text: string;
  before: Summary;
  after: Summary;
  passes: PassRecord[];
  usage: { used: number; limit: number };
}

export default function HumanizePage() {
  const router = useRouter();
  const [input, setInput] = useState("");
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [useVoice, setUseVoice] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<HumanizeResponse | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    const handoff = sessionStorage.getItem(HANDOFF_KEY);
    if (handoff) {
      setInput(handoff);
      sessionStorage.removeItem(HANDOFF_KEY);
    }
  }, []);

  const live = useMemo(() => analyzeText(input), [input]);
  const canRun = live.wordCount >= 15 && !busy;

  async function humanize() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: input,
          fingerprint: useVoice && profile ? profile.fingerprint : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Humanize failed.");
      setResult(data as HumanizeResponse);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Humanize failed.");
    } finally {
      setBusy(false);
    }
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Humanize</h1>
        <p className="mt-1 max-w-[60ch] text-sm leading-relaxed text-muted">
          Paste AI-written text. It gets rewritten until it reads human, with the
          meaning left intact. Each pass is scored and only kept if it improves.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Input */}
        <div className="flex flex-col rounded-2xl border border-line bg-raised">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-medium">Your text</span>
            <span className="font-mono text-xs tabular-nums text-faint">
              {live.wordCount} words
              {live.wordCount >= 15 && ` · ${live.score}/100 human`}
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={16}
            aria-label="Text to humanize"
            placeholder="Paste the text you want to humanize..."
            className="min-h-[340px] flex-1 resize-y bg-transparent p-4 text-sm leading-relaxed outline-none placeholder:text-faint"
          />
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
            {profile ? (
              <label className="flex items-center gap-2 text-xs text-muted">
                <input
                  type="checkbox"
                  checked={useVoice}
                  onChange={(e) => setUseVoice(e.target.checked)}
                  className="size-3.5 accent-[var(--accent)]"
                />
                Rewrite in my voice
              </label>
            ) : (
              <span className="text-xs text-faint">No voice profile saved</span>
            )}
            <button
              type="button"
              disabled={!canRun}
              onClick={humanize}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <SparkleIcon size={16} weight="bold" />
              {busy ? "Rewriting..." : "Humanize"}
            </button>
          </div>
        </div>

        {/* Output */}
        <div className="flex flex-col rounded-2xl border border-line bg-raised">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-medium">Humanized</span>
            {result && (
              <button
                type="button"
                onClick={copy}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink"
              >
                {copied ? (
                  <>
                    <CheckIcon size={14} weight="bold" className="text-good" /> Copied
                  </>
                ) : (
                  <>
                    <CopyIcon size={14} weight="bold" /> Copy
                  </>
                )}
              </button>
            )}
          </div>

          {busy ? (
            <div className="flex-1 space-y-3 p-4">
              {[0, 1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-4 animate-pulse rounded bg-line"
                  style={{ width: `${90 - i * 8}%` }}
                />
              ))}
              <p className="pt-2 text-xs text-faint">
                Rewriting and re-scoring. This can take up to a minute.
              </p>
            </div>
          ) : result ? (
            <div className="min-h-[340px] flex-1 whitespace-pre-wrap p-4 text-sm leading-relaxed">
              {result.text}
            </div>
          ) : (
            <div className="flex min-h-[340px] flex-1 items-center justify-center p-6 text-center">
              <p className="max-w-[32ch] text-sm leading-relaxed text-faint">
                The rewritten version appears here, with a before and after score.
              </p>
            </div>
          )}
        </div>
      </div>

      {error && (
        <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>
      )}

      {result && (
        <div className="rounded-2xl border border-line bg-raised p-6">
          <div className="flex flex-wrap items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <ScoreGauge
                  score={result.before.score}
                  verdict={result.before.verdict}
                  size={88}
                />
                <p className="mt-1 text-xs text-faint">Before</p>
              </div>
              <ArrowRightIcon size={20} weight="bold" className="text-faint" />
              <div className="text-center">
                <ScoreGauge
                  score={result.after.score}
                  verdict={result.after.verdict}
                  size={88}
                />
                <p className="mt-1 text-xs text-faint">After</p>
              </div>
            </div>

            <ul className="min-w-[220px] flex-1 space-y-2">
              {result.after.metrics.map((m) => {
                const was = result.before.metrics.find((b) => b.id === m.id);
                const delta = was ? m.score - was.score : 0;
                return (
                  <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <span className="text-muted">{m.label}</span>
                    <span className="font-mono tabular-nums">
                      {m.score}
                      {delta !== 0 && (
                        <span className={delta > 0 ? "text-good" : "text-bad"}>
                          {" "}
                          {delta > 0 ? "+" : ""}
                          {delta}
                        </span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>

            <div className="text-xs leading-relaxed text-faint">
              <p className="font-medium text-muted">
                {result.passes.length === 0
                  ? "Already read human. No rewrite needed."
                  : `${result.passes.length} pass${result.passes.length > 1 ? "es" : ""} run`}
              </p>
              {result.passes.map((p) => (
                <p key={p.pass}>
                  Pass {p.pass}: {p.score}/100{" "}
                  {p.accepted ? "kept" : `discarded (${p.rejectedBecause})`}
                </p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
