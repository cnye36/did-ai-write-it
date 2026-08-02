"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { CursorClickIcon } from "@phosphor-icons/react";
import { ScoreGauge } from "@/components/detect/score-gauge";
import { Reveal } from "@/components/ui/reveal";
import type { Verdict } from "@/lib/detector";

const STEPS = [
  {
    title: "Paste your text",
    body: "Drop in an email, essay, or report. Text or a file, either works.",
  },
  {
    title: "We check it",
    body: "Every sentence gets scanned for the patterns AI writing leaves behind.",
  },
  {
    title: "Get your results",
    body: "See your score and exactly which lines got flagged, with the reasoning behind each one.",
  },
];

export function HowItWorks() {
  return (
    <section id="how" className="border-t border-line py-20 md:py-28">
      <Reveal>
        <h2 className="text-3xl font-semibold tracking-tighter md:text-4xl">How it works</h2>
      </Reveal>
      <div className="mt-12 grid gap-10 md:grid-cols-3 md:gap-8">
        <Reveal delay={0}>
          <StepCard title={STEPS[0].title} body={STEPS[0].body}>
            <PasteGraphic />
          </StepCard>
        </Reveal>
        <Reveal delay={0.08}>
          <StepCard title={STEPS[1].title} body={STEPS[1].body}>
            <ScanGraphic />
          </StepCard>
        </Reveal>
        <Reveal delay={0.16}>
          <StepCard title={STEPS[2].title} body={STEPS[2].body}>
            <ResultsGraphic />
          </StepCard>
        </Reveal>
      </div>
    </section>
  );
}

function StepCard({
  title,
  body,
  children,
}: {
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-2xl border border-line bg-raised p-4">
        {children}
      </div>
      <div>
        <h3 className="font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 max-w-[42ch] text-sm leading-relaxed text-muted">{body}</p>
      </div>
    </div>
  );
}

function PasteGraphic() {
  const reduce = useReducedMotion();
  const widths = ["92%", "76%", "58%"];

  return (
    <div className="flex h-40 flex-col justify-between rounded-xl bg-surface p-3">
      <div className="space-y-2">
        {widths.map((w, i) => (
          <motion.div
            key={w}
            className="h-2 origin-left rounded-full bg-line"
            style={{ width: w }}
            initial={reduce ? false : { scaleX: 0, opacity: 0 }}
            whileInView={{ scaleX: 1, opacity: 1 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.4, delay: 0.25 + i * 0.12, ease: [0.16, 1, 0.3, 1] }}
          />
        ))}
      </div>
      <div className="relative flex justify-end">
        <motion.span
          className="rounded-full bg-accent px-3 py-1.5 text-[11px] font-medium text-accent-ink"
          initial={reduce ? false : { scale: 1 }}
          whileInView={reduce ? undefined : { scale: [1, 1, 0.9, 1] }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.5, delay: 1.05, times: [0, 0.6, 0.8, 1] }}
        >
          Analyze
        </motion.span>
        {!reduce && (
          <motion.span
            className="pointer-events-none absolute -top-8 right-1 text-ink"
            initial={{ x: 26, y: -18, opacity: 0 }}
            whileInView={{ x: [26, 0, 0], y: [-18, 0, 0], opacity: [0, 1, 1] }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 1, delay: 0.85, times: [0, 0.75, 1], ease: "easeOut" }}
          >
            <CursorClickIcon size={18} weight="fill" />
          </motion.span>
        )}
      </div>
    </div>
  );
}

function ScanGraphic() {
  const reduce = useReducedMotion();
  const widths = ["94%", "68%", "84%", "52%"];

  return (
    <div className="relative h-40 overflow-hidden rounded-xl bg-surface p-3">
      <div className="space-y-2.5 pt-1">
        {widths.map((w, i) => (
          <div key={w} className="relative h-2 overflow-hidden rounded-full bg-line" style={{ width: w }}>
            <motion.div
              className="absolute inset-0 rounded-full bg-accent"
              initial={reduce ? false : { opacity: 0 }}
              whileInView={reduce ? undefined : { opacity: [0, 1, 0] }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.55, delay: 0.35 + i * 0.28, ease: "easeInOut" }}
            />
          </div>
        ))}
      </div>
      {!reduce && (
        <motion.div
          className="absolute inset-x-3 top-1 h-3 rounded bg-accent/15"
          initial={{ y: 0, opacity: 0 }}
          whileInView={{ y: [0, 118, 118], opacity: [0, 1, 0] }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.5, delay: 0.2, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}

const DEMO_SCORE = 82;
const DEMO_VERDICT: Verdict = "human";

function ResultsGraphic() {
  const reduce = useReducedMotion();

  return (
    <div className="flex h-40 items-center gap-4 rounded-xl bg-surface p-3">
      <AnimatedScoreGauge target={DEMO_SCORE} verdict={DEMO_VERDICT} />
      <div className="flex-1 space-y-1.5">
        <div className="h-2 w-[88%] rounded-full bg-line" />
        <motion.div
          className="h-2 w-[68%] rounded-full"
          style={{ background: "var(--bad-soft)" }}
          initial={reduce ? false : { opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.4, delay: 0.75 }}
        />
        <div className="h-2 w-[52%] rounded-full bg-line" />
      </div>
    </div>
  );
}

function AnimatedScoreGauge({ target, verdict }: { target: number; verdict: Verdict }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  const [score, setScore] = useState(reduce ? target : 0);

  useEffect(() => {
    if (!inView || reduce) return;
    const duration = 900;
    const start = performance.now();
    let raf: number;
    function tick(now: number) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setScore(Math.round(eased * target));
      if (t < 1) raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [inView, reduce, target]);

  return (
    <div ref={ref} className="shrink-0">
      <ScoreGauge score={score} verdict={verdict} size={72} />
    </div>
  );
}
