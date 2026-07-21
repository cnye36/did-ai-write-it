"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { SparkleIcon, FloppyDiskIcon, CheckIcon } from "@phosphor-icons/react";
import { analyzeText } from "@/lib/detector";
import {
  loadProfile,
  loadDrafts,
  saveDraft,
  FORMAT_LABELS,
  type ContentFormat,
  type VoiceProfile,
} from "@/lib/voice";
import { ScoreGauge } from "@/components/score-gauge";
import { HighlightedText } from "@/components/highlighted-text";

const FORMATS: ContentFormat[] = ["linkedin", "newsletter", "thread"];

function WriteStudio() {
  const params = useSearchParams();
  const [profile, setProfile] = useState<VoiceProfile | null>(null);
  const [loaded, setLoaded] = useState(false);

  const [format, setFormat] = useState<ContentFormat>("linkedin");
  const [topic, setTopic] = useState("");
  const [notes, setNotes] = useState("");
  const [content, setContent] = useState("");
  const [draftId, setDraftId] = useState<string | null>(null);

  const [generating, setGenerating] = useState(false);
  const [humanizing, setHumanizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFlags, setShowFlags] = useState(false);
  const [saved, setSaved] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    setProfile(loadProfile());
    const id = params.get("draft");
    if (id) {
      const d = loadDrafts().find((x) => x.id === id);
      if (d) {
        setDraftId(d.id);
        setFormat(d.format);
        setTopic(d.title);
        setContent(d.content);
      }
    }
    setLoaded(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const result = useMemo(() => analyzeText(content), [content]);
  const busy = generating || humanizing;

  async function generate() {
    if (!profile || !topic.trim()) return;
    setGenerating(true);
    setError(null);
    setContent("");
    setShowFlags(false);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          fingerprint: profile.fingerprint,
          samples: profile.samples,
          format,
          topic,
          notes,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Generation failed (${res.status}).`);
      }
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setContent(acc);
      }
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) {
        setError(e instanceof Error ? e.message : "Generation failed.");
      }
    } finally {
      setGenerating(false);
    }
  }

  async function humanize() {
    if (!profile || !content.trim()) return;
    setHumanizing(true);
    setError(null);
    try {
      const problems = result.flags.map((f) =>
        f.text ? `"${f.text}": ${f.reason}` : f.reason
      );
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fingerprint: profile.fingerprint, text: content, problems }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rewrite failed.");
      setContent(data.text);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Rewrite failed.");
    } finally {
      setHumanizing(false);
    }
  }

  function save() {
    const id = draftId ?? crypto.randomUUID();
    setDraftId(id);
    saveDraft({
      id,
      title: topic.trim() || "Untitled",
      format,
      content,
      score: result.score,
      updatedAt: new Date().toISOString(),
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1600);
  }

  if (!loaded) {
    return <div className="h-64 animate-pulse rounded-2xl border border-line bg-raised" />;
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-xl rounded-2xl border border-line bg-raised p-10 text-center">
        <h1 className="text-lg font-semibold tracking-tight">No voice profile yet</h1>
        <p className="mx-auto mt-2 max-w-[40ch] text-sm leading-relaxed text-muted">
          The editor writes from your fingerprint, so it needs one before it can
          draft anything.
        </p>
        <Link
          href="/app/onboarding"
          className="mt-5 inline-block rounded-full bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97]"
        >
          Build my voice profile
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
      {/* Brief panel */}
      <div className="space-y-5 lg:sticky lg:top-20 lg:self-start">
        <h1 className="text-2xl font-semibold tracking-tight">Write</h1>
        <div>
          <p className="mb-2 text-sm font-medium">Format</p>
          <div className="flex flex-wrap gap-2">
            {FORMATS.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFormat(f)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-colors active:scale-[0.97] ${
                  format === f
                    ? "bg-accent text-accent-ink"
                    : "border border-line text-muted hover:text-ink"
                }`}
              >
                {FORMAT_LABELS[f]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="topic" className="mb-2 block text-sm font-medium">
            Topic
          </label>
          <input
            id="topic"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="What is this piece about?"
            className="w-full rounded-[10px] border border-line bg-raised px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-faint focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="notes" className="mb-2 block text-sm font-medium">
            Raw thoughts
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={7}
            placeholder="Bullet points, half-sentences, the story behind it. The messier the better; this is what keeps it yours."
            className="w-full resize-y rounded-[10px] border border-line bg-raised p-3 text-sm leading-relaxed outline-none transition-colors placeholder:text-faint focus:border-accent"
          />
        </div>
        <button
          type="button"
          disabled={busy || !topic.trim()}
          onClick={generate}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-accent-ink transition-transform active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <SparkleIcon size={16} weight="bold" />
          {generating ? "Writing in your voice..." : "Draft it"}
        </button>
        {error && (
          <p className="rounded-[10px] bg-bad-soft px-4 py-3 text-sm text-bad">{error}</p>
        )}
      </div>

      {/* Editor + Human Check */}
      <div className="space-y-5">
        <div className="rounded-2xl border border-line bg-raised">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFlags(false)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  !showFlags ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
                }`}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setShowFlags(true)}
                disabled={!content.trim()}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-40 ${
                  showFlags ? "bg-accent-soft text-accent" : "text-muted hover:text-ink"
                }`}
              >
                Show tells
              </button>
            </div>
            <button
              type="button"
              onClick={save}
              disabled={!content.trim()}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted transition-colors hover:text-ink disabled:opacity-40"
            >
              {saved ? (
                <>
                  <CheckIcon size={14} weight="bold" className="text-good" /> Saved
                </>
              ) : (
                <>
                  <FloppyDiskIcon size={14} weight="bold" /> Save draft
                </>
              )}
            </button>
          </div>
          {showFlags ? (
            <div className="min-h-[320px] p-4 text-sm">
              <HighlightedText text={content} flags={result.flags} />
            </div>
          ) : (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={14}
              aria-label="Draft content"
              placeholder={
                generating
                  ? ""
                  : "Your draft lands here. Brief it on the left, or paste something to check."
              }
              className="min-h-[320px] w-full resize-y rounded-b-2xl bg-transparent p-4 text-sm leading-relaxed outline-none placeholder:text-faint"
            />
          )}
        </div>

        {content.trim() && (
          <div className="rounded-2xl border border-line bg-raised p-5">
            <div className="flex flex-wrap items-start gap-6">
              <ScoreGauge score={result.score} verdict={result.verdict} size={110} />
              <div className="min-w-[200px] flex-1">
                <ul className="space-y-2">
                  {result.metrics.map((m) => (
                    <li key={m.id} className="text-sm">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="font-medium">{m.label}</span>
                        <span className="font-mono tabular-nums text-muted">{m.score}</span>
                      </div>
                      <p className="text-xs text-faint">{m.detail}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="w-full sm:w-auto">
                <button
                  type="button"
                  disabled={busy || result.flags.length === 0}
                  onClick={humanize}
                  className="w-full rounded-full border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:border-faint active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                >
                  {humanizing
                    ? "Rewriting..."
                    : result.flags.length === 0
                      ? "Nothing to fix"
                      : `Fix ${result.flags.length} tell${result.flags.length > 1 ? "s" : ""} in my voice`}
                </button>
                {result.thin && (
                  <p className="mt-2 max-w-[24ch] text-xs text-faint">
                    Short texts score roughly. Judge from 40+ words.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WritePage() {
  return (
    <Suspense
      fallback={<div className="h-64 animate-pulse rounded-2xl border border-line bg-raised" />}
    >
      <WriteStudio />
    </Suspense>
  );
}
