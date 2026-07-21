"use client";

import { useMemo, useState } from "react";
import { analyzeText } from "@/lib/detector";
import { ScoreGauge } from "./score-gauge";

/*
  Real, working Human Check running in the hero. Not a mockup:
  it calls the same analyzeText() the product uses.
*/

const SLOP_SAMPLE = `In today's fast-paced digital landscape, personal branding is crucial. You need to delve into what makes your story unique — and leverage it. It's not just about posting, it's about building a robust presence. Consistency, authenticity, and value are the keys to success. Embrace these cutting-edge strategies to elevate your content and unlock the power of your network.`;

const HUMAN_SAMPLE = `I spent three years posting on LinkedIn before anyone cared. Know what changed? I stopped writing posts and started writing to one specific person: a founder I'd met at a conference who couldn't hire fast enough. Every post since is a letter to her. Reach tripled in a quarter. Turns out the algorithm likes it when an actual human is on the other end.`;

export function LiveDemo() {
  const [text, setText] = useState(SLOP_SAMPLE);
  const result = useMemo(() => analyzeText(text), [text]);

  return (
    <div className="rounded-2xl border border-line bg-raised p-5 shadow-[0_8px_40px_-16px_rgba(20,20,40,0.15)] dark:shadow-none">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-muted">Try the Human Check</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setText(SLOP_SAMPLE)}
            className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted transition-colors hover:text-ink active:scale-[0.97]"
          >
            AI slop
          </button>
          <button
            type="button"
            onClick={() => setText(HUMAN_SAMPLE)}
            className="rounded-full border border-line px-3 py-1 text-xs font-medium text-muted transition-colors hover:text-ink active:scale-[0.97]"
          >
            Human draft
          </button>
        </div>
      </div>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={7}
        aria-label="Text to check"
        className="w-full resize-none rounded-[10px] border border-line bg-surface p-3 text-sm leading-relaxed text-ink outline-none transition-colors focus:border-accent"
      />
      <div className="mt-4 flex items-center gap-5">
        <ScoreGauge score={result.score} verdict={result.verdict} size={96} />
        <ul className="min-w-0 flex-1 space-y-1.5">
          {result.metrics.map((m) => (
            <li key={m.id} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="text-muted">{m.label}</span>
              <span className="font-mono tabular-nums text-ink">{m.score}</span>
            </li>
          ))}
        </ul>
      </div>
      {result.flags.length > 0 && (
        <p className="mt-3 text-xs text-faint">
          {result.flags.length} tell{result.flags.length > 1 ? "s" : ""} found. Edit the text
          and watch the score move.
        </p>
      )}
    </div>
  );
}
