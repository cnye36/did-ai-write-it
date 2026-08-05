import type { SupabaseClient } from "@supabase/supabase-js";
import { QuotaExceededError } from "./api-errors";
import { createServiceClient } from "./supabase/service";

export type Plan = "free" | "lite" | "plus" | "pro";

export const PLAN_LIMITS: Record<Plan, number> = {
  free: 2_000,
  lite: 40_000,
  plus: 150_000,
  pro: 500_000,
};

export function remainingWords(plan: Plan, wordsUsed: number): number {
  return Math.max(0, PLAN_LIMITS[plan] - wordsUsed);
}

/**
 * Plagiarism and fact-check cost Winston 2 credits/word, double AI detection's
 * 1 credit/word (per docs.gowinston.ai). Charging the same multiplier against
 * the monthly quota keeps a single shared word pool (no separate plan-gating)
 * while still reflecting the real cost difference, so heavy add-on usage
 * draws down a user's quota proportionally to what it actually costs us.
 */
export const PLAGIARISM_WORD_MULTIPLIER = 2;
export const FACT_CHECK_WORD_MULTIPLIER = 2;

/**
 * Rewrite-assist (lib/rewrite-assist.ts) has no Winston cost to peg a
 * multiplier to, unlike the two above, but it's a generative OpenAI call with
 * real per-word processing cost on both sides (input context + generated
 * output), at least as heavy as plagiarism/fact-check. Reusing that same 2x
 * keeps the shared pool's mental model simple: 1x = scored only, 2x = deeper
 * work. Draws from the same monthly words_used pool as everything else.
 */
export const REWRITE_ASSIST_WORD_MULTIPLIER = 2;

/** Floor so a trivial selection (a couple of words) still costs something on
 *  quota, since it still triggers a real OpenAI call with bounded context. */
export const REWRITE_ASSIST_MIN_WORDS = 20;

export function rewriteAssistQuotaWords(wordCount: number): number {
  return Math.max(wordCount, REWRITE_ASSIST_MIN_WORDS) * REWRITE_ASSIST_WORD_MULTIPLIER;
}

/**
 * Shared quota gate for humanize and detect requests, both of which draw from
 * the same monthly words_used pool. Throws QuotaExceededError; no-op for the
 * DEV_BYPASS_EMAIL account. There is no per-request word cap; requests are
 * bounded only by each route's own MAX_CHARS.
 */
export function assertWithinQuota(
  plan: Plan,
  wordsUsed: number,
  requestedWords: number,
  bypass: boolean
): void {
  if (bypass) return;
  const remaining = remainingWords(plan, wordsUsed);
  if (requestedWords > remaining) {
    throw new QuotaExceededError(plan, PLAN_LIMITS[plan]);
  }
}

/**
 * The only way to spend quota. Wraps the increment_usage RPC, which enforces
 * the plan limit atomically under its own row lock (p_limit null for the
 * dev-bypass account). This is the authoritative check: assertWithinQuota is
 * still called earlier in each route as a fast pre-check, but only this call
 * closes the check-then-increment race a pure pre-check can't, since two
 * concurrent requests can both pass a pre-check against the same stale
 * words_used before either has actually written back. Throws
 * QuotaExceededError if the limit would be exceeded (nothing gets charged in
 * that case); returns the new words_used total otherwise.
 */
export async function incrementUsage(
  _supabase: SupabaseClient,
  userId: string,
  words: number,
  plan: Plan,
  bypass: boolean
): Promise<number> {
  const service = createServiceClient();
  const { data, error } = (await service
    .rpc("increment_usage", {
      p_user_id: userId,
      p_words: words,
      p_limit: bypass ? null : PLAN_LIMITS[plan],
    })
    .single()) as {
    data: { words_used: number; plan: string; ok: boolean } | null;
    error: { message: string } | null;
  };

  if (error || !data) {
    console.error("Failed to update usage:", error?.message ?? "No usage row returned.");
    throw new Error("Could not update usage.");
  }
  if (!data.ok) {
    throw new QuotaExceededError(plan, PLAN_LIMITS[plan]);
  }
  return data.words_used;
}

/** Undo a reservation when a paid provider returns no result. Service-role
 *  only so clients cannot lower their own counters through the Data API. */
export async function refundUsage(userId: string, words: number): Promise<number> {
  const service = createServiceClient();
  const { data, error } = await service.rpc("refund_usage", {
    p_user_id: userId,
    p_words: words,
  });

  if (error || typeof data !== "number") {
    console.error("Failed to refund usage:", error?.message ?? "No usage total returned.");
    throw new Error("Could not update usage.");
  }
  return data;
}

/** Like refundUsage, but logs and returns null instead of throwing. Use in
 *  catch paths so a refund failure does not mask the original error. */
export async function safeRefundUsage(
  userId: string,
  words: number
): Promise<number | null> {
  try {
    return await refundUsage(userId, words);
  } catch (err) {
    console.error("safeRefundUsage failed:", err);
    return null;
  }
}

/** Parse a "YYYY-MM-DD" (or ISO) date as UTC midnight. */
function parseUtcDate(date: string): Date {
  const day = date.slice(0, 10);
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

/** Add calendar months in UTC, clamping the day for short months (Jan 31 → Feb 28). */
export function addUtcMonths(date: Date, months: number): Date {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + months;
  const day = date.getUTCDate();
  const end = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, m, Math.min(day, end)));
}

/** Exclusive end of the credit period that started on `periodStart` (start + 1 month). */
export function periodEndDate(periodStart: string): Date {
  return addUtcMonths(parseUtcDate(periodStart), 1);
}

/**
 * True if `periodStart` is still the active credit cycle: now is before
 * period_start + 1 month. Cycles are anchored to signup / plan-change day,
 * not the 1st of the calendar month.
 */
export function isCurrentPeriod(periodStart: string, now = new Date()): boolean {
  return now.getTime() < periodEndDate(periodStart).getTime();
}

/** Words used in the active cycle; 0 if `period_start` has expired. */
export function wordsUsedInCurrentPeriod(
  periodStart: string | null | undefined,
  wordsUsed: number | null | undefined,
  now = new Date()
): number {
  if (!periodStart || wordsUsed == null) return 0;
  return isCurrentPeriod(periodStart, now) ? wordsUsed : 0;
}

/** Format the next credit reset day for UI copy. */
export function formatPeriodResetLabel(periodStart: string, now = new Date()): string {
  const end = periodEndDate(periodStart);
  // If the stored period already expired, show the end of the period that
  // would start "now" after rollover (tomorrow's cycle ends in ~1 month).
  const labelDate =
    now.getTime() < end.getTime() ? end : addUtcMonths(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), 1);
  return labelDate.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Today's date as YYYY-MM-DD in UTC. */
export function utcToday(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** True if the signed-in email matches DEV_BYPASS_EMAIL, exempting it from quota checks. */
export function isDevBypass(email: string | undefined | null): boolean {
  if (process.env.NODE_ENV === "production") return false;
  const bypassEmail = process.env.DEV_BYPASS_EMAIL;
  if (!bypassEmail || !email) return false;
  return email.toLowerCase() === bypassEmail.toLowerCase();
}
