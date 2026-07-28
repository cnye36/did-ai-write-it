"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/** sessionStorage key used to carry text from the landing page into the detector or humanizer. */
export const HANDOFF_KEY = "lawi.humanizeText";

const subscribe = () => () => {};

function getHandoff(): string {
  return sessionStorage.getItem(HANDOFF_KEY) ?? "";
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
