import { afterEach, describe, expect, it } from "vitest";
import {
  addUtcMonths,
  formatPeriodResetLabel,
  isCurrentPeriod,
  isDevBypass,
  periodEndDate,
  PLAN_LIMITS,
  remainingWords,
  REWRITE_ASSIST_WORD_MULTIPLIER,
  rewriteAssistQuotaWords,
  wordsUsedInCurrentPeriod,
} from "./usage";

describe("remainingWords", () => {
  it("returns the full limit when nothing has been used", () => {
    expect(remainingWords("free", 0)).toBe(2_000);
    expect(remainingWords("lite", 0)).toBe(40_000);
    expect(remainingWords("plus", 0)).toBe(150_000);
    expect(remainingWords("pro", 0)).toBe(500_000);
  });

  it("subtracts words already used", () => {
    expect(remainingWords("free", 200)).toBe(1_800);
  });

  it("floors at zero instead of going negative", () => {
    expect(remainingWords("free", 2_500)).toBe(0);
  });

  it("matches the plan limits advertised on the landing page", () => {
    expect(PLAN_LIMITS).toEqual({ free: 2_000, lite: 40_000, plus: 150_000, pro: 500_000 });
  });
});

describe("rewriteAssistQuotaWords", () => {
  it("matches plagiarism/fact-check's existing 2x multiplier", () => {
    expect(REWRITE_ASSIST_WORD_MULTIPLIER).toBe(2);
  });

  it("floors tiny selections to the minimum before applying the multiplier", () => {
    expect(rewriteAssistQuotaWords(5)).toBe(40); // max(5, 20) * 2
  });

  it("scales normally once past the floor", () => {
    expect(rewriteAssistQuotaWords(100)).toBe(200);
  });
});

describe("isCurrentPeriod", () => {
  it("is true within one month of period_start", () => {
    const now = new Date(Date.UTC(2026, 6, 29)); // Jul 29
    expect(isCurrentPeriod("2026-07-15", now)).toBe(true);
  });

  it("is false once the anniversary month has elapsed", () => {
    const now = new Date(Date.UTC(2026, 7, 15)); // Aug 15
    expect(isCurrentPeriod("2026-07-15", now)).toBe(false);
  });

  it("is still true the day before the anniversary", () => {
    const now = new Date(Date.UTC(2026, 7, 14, 23, 59)); // Aug 14
    expect(isCurrentPeriod("2026-07-15", now)).toBe(true);
  });

  it("is false once a full month from period_start has elapsed", () => {
    // June 1 cycle ends July 1; July 29 is past that.
    const now = new Date(Date.UTC(2026, 6, 29));
    expect(isCurrentPeriod("2026-06-01", now)).toBe(false);
  });
});

describe("periodEndDate / addUtcMonths", () => {
  it("adds one calendar month", () => {
    expect(periodEndDate("2026-07-15").toISOString().slice(0, 10)).toBe("2026-08-15");
  });

  it("clamps short months", () => {
    expect(addUtcMonths(new Date(Date.UTC(2026, 0, 31)), 1).toISOString().slice(0, 10)).toBe(
      "2026-02-28"
    );
  });
});

describe("wordsUsedInCurrentPeriod", () => {
  it("returns the stored count when the period is active", () => {
    const now = new Date(Date.UTC(2026, 6, 20));
    expect(wordsUsedInCurrentPeriod("2026-07-15", 280, now)).toBe(280);
  });

  it("returns 0 when the period has expired", () => {
    const now = new Date(Date.UTC(2026, 7, 20));
    expect(wordsUsedInCurrentPeriod("2026-07-15", 280, now)).toBe(0);
  });
});

describe("formatPeriodResetLabel", () => {
  it("labels the exclusive end of the active period", () => {
    const now = new Date(Date.UTC(2026, 6, 20));
    expect(formatPeriodResetLabel("2026-07-15", now)).toMatch(/August 15/);
  });
});

describe("isDevBypass", () => {
  afterEach(() => {
    delete process.env.DEV_BYPASS_EMAIL;
  });

  it("is false when DEV_BYPASS_EMAIL is unset", () => {
    expect(isDevBypass("someone@example.com")).toBe(false);
  });

  it("matches case-insensitively against DEV_BYPASS_EMAIL", () => {
    process.env.DEV_BYPASS_EMAIL = "Dev@Example.com";
    expect(isDevBypass("dev@example.com")).toBe(true);
    expect(isDevBypass("other@example.com")).toBe(false);
  });
});
