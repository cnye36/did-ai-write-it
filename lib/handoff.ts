"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** Session-only continuation payload for a public tool page. */
export type CheckKind = "detect" | "plagiarism" | "fact_check";

export type CheckHandoff = {
  text: string;
  kind: CheckKind;
};

/** sessionStorage key used to carry text from public pages into the app. */
export const HANDOFF_KEY = "lawi.humanizeText";

const subscribe = () => () => {};

function getHandoff(): string {
  const raw = sessionStorage.getItem(HANDOFF_KEY);
  if (!raw) return "";

  try {
    const handoff = JSON.parse(raw) as Partial<CheckHandoff>;
    return typeof handoff.text === "string" ? handoff.text : raw;
  } catch {
    // Preserve the old text-only value so existing handoffs still work.
    return raw;
  }
}

export function saveCheckHandoff(handoff: CheckHandoff): void {
  sessionStorage.setItem(HANDOFF_KEY, JSON.stringify(handoff));
}

/**
 * Editable text state seeded from a one-shot sessionStorage handoff.
 * Reads via useSyncExternalStore (SSR-safe); never setStates inside an effect.
 * Optional `seed` covers saved-run hydration when there is no handoff.
 */
export function useHandoffInput(seed = ""): [string, (value: string) => void] {
  const handoff = useSyncExternalStore(subscribe, getHandoff, () => "");
  const [input, setInput] = useState(seed);
  const [applied, setApplied] = useState(false);

  // Adjust state during render when the client snapshot arrives (React-recommended).
  if (handoff && !applied) {
    setApplied(true);
    setInput(handoff);
  }

  useEffect(() => {
    if (handoff) sessionStorage.removeItem(HANDOFF_KEY);
  }, [handoff]);

  return [input, setInput];
}
