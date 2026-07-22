import { afterEach, describe, expect, it } from "vitest";
import { isCurrentPeriod, isDevBypass, PLAN_LIMITS, remainingWords } from "./usage";

describe("remainingWords", () => {
  it("returns the full limit when nothing has been used", () => {
    expect(remainingWords("free", 0)).toBe(500);
    expect(remainingWords("lite", 0)).toBe(10_000);
    expect(remainingWords("pro", 0)).toBe(30_000);
    expect(remainingWords("studio", 0)).toBe(100_000);
  });

  it("subtracts words already used", () => {
    expect(remainingWords("free", 200)).toBe(300);
  });

  it("floors at zero instead of going negative", () => {
    expect(remainingWords("free", 900)).toBe(0);
  });

  it("matches the plan limits advertised on the landing page", () => {
    expect(PLAN_LIMITS).toEqual({ free: 500, lite: 10_000, pro: 30_000, studio: 100_000 });
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
