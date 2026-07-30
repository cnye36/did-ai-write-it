import { describe, expect, it } from "vitest";
import { safeAuthNext } from "./auth-next";

describe("safeAuthNext", () => {
  it("keeps an approved app destination and its auto-run marker", () => {
    expect(safeAuthNext("/app/plagiarism?autorun=1")).toBe("/app/plagiarism?autorun=1");
  });

  it("defaults when no destination is supplied", () => {
    expect(safeAuthNext(undefined)).toBe("/app/detect");
  });

  it("rejects external, malformed, and unrelated paths", () => {
    expect(safeAuthNext("https://example.com")).toBe("/app/detect");
    expect(safeAuthNext("//example.com/app/detect")).toBe("/app/detect");
    expect(safeAuthNext("/pricing")).toBe("/app/detect");
  });
});
