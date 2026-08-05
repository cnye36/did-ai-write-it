"use client";

import { motion, useReducedMotion } from "motion/react";

export function Reveal({
  children,
  delay = 0,
  className,
  amount = 0.25,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
  /** Fraction of the target's area that must be in view before it fades in. Lower this for tall blocks, since a large target may never reach 0.25 area overlap with the viewport. */
  amount?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={className}
      initial={reduce ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.div>
  );
}
