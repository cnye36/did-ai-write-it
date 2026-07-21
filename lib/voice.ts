/*
  Voice fingerprint types + localStorage persistence.
  No backend storage in this build: the profile lives in the browser.
*/

export interface VoiceFingerprint {
  summary: string;
  tone: string;
  sentenceRhythm: string;
  vocabulary: string;
  punctuationHabits: string[];
  signaturePhrases: string[];
  openers: string;
  closers: string;
  opinions: string;
  neverSays: string[];
  quirks: string[];
}

export interface VoiceProfile {
  fingerprint: VoiceFingerprint;
  samples: string[];
  createdAt: string;
}

export type ContentFormat = "linkedin" | "newsletter" | "thread";

export const FORMAT_LABELS: Record<ContentFormat, string> = {
  linkedin: "LinkedIn post",
  newsletter: "Newsletter section",
  thread: "X thread",
};

export interface Draft {
  id: string;
  title: string;
  format: ContentFormat;
  content: string;
  score: number;
  updatedAt: string;
}

const PROFILE_KEY = "lawi.voiceProfile";
const DRAFTS_KEY = "lawi.drafts";

/** sessionStorage key used to carry text from the landing page into the humanizer. */
export const HANDOFF_KEY = "lawi.humanizeText";

export function loadProfile(): VoiceProfile | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    return raw ? (JSON.parse(raw) as VoiceProfile) : null;
  } catch {
    return null;
  }
}

export function saveProfile(profile: VoiceProfile) {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export function clearProfile() {
  localStorage.removeItem(PROFILE_KEY);
}

export function loadDrafts(): Draft[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(DRAFTS_KEY);
    return raw ? (JSON.parse(raw) as Draft[]) : [];
  } catch {
    return [];
  }
}

export function saveDraft(draft: Draft) {
  const drafts = loadDrafts().filter((d) => d.id !== draft.id);
  drafts.unshift(draft);
  localStorage.setItem(DRAFTS_KEY, JSON.stringify(drafts.slice(0, 50)));
}

export function deleteDraft(id: string) {
  localStorage.setItem(
    DRAFTS_KEY,
    JSON.stringify(loadDrafts().filter((d) => d.id !== id))
  );
}
