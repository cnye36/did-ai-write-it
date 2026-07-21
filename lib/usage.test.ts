import { describe, expect, it } from "vitest";
import { isCurrentPeriod, PLAN_LIMITS, remainingWords } from "./usage";

describe("remainingWords", () => {
  it("returns the full limit when nothing has been used", () => {
    expect(remainingWords("free", 0)).toBe(500);
    expect(remainingWords("pro", 0)).toBe(50_000);
    expect(remainingWords("studio", 0)).toBe(200_000);
  });

  it("subtracts words already used", () => {
    expect(remainingWords("free", 200)).toBe(300);
  });

  it("floors at zero instead of going negative", () => {
    expect(remainingWords("free", 900)).toBe(0);
  });

  it("matches the plan limits advertised on the landing page", () => {
    expect(PLAN_LIMITS).toEqual({ free: 500, pro: 50_000, studio: 200_000 });
  });
});

describe("isCurrentPeriod", () => {
  it("is true for a period_start in the same UTC month", () => {
    const now = new Date(Date.UTC(2026, 6, 21));
    expect(isCurrentPeriod("2026-07-01", now)).toBe(true);
  });

  it("is false once the month has rolled over", () => {
    const now = new Date(Date.UTC(2026, 7, 1));
    expect(isCurrentPeriod("2026-07-01", now)).toBe(false);
  });
});
