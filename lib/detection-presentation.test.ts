import { describe, expect, it } from "vitest";
import { detectionPresentation, detectionTransition } from "./detection-presentation";

describe("detectionPresentation", () => {
  it("turns detector scores into qualified plain-language results", () => {
    expect(detectionPresentation(0).signal).toBe("Strong AI signal");
    expect(detectionPresentation(30).title).toBe("Likely AI-generated");
    expect(detectionPresentation(50).signal).toBe("Inconclusive");
    expect(detectionPresentation(75).title).toBe("Likely human-written");
    expect(detectionPresentation(95).signal).toBe("Strong human signal");
  });

  it("describes version changes without exposing score deltas", () => {
    expect(detectionTransition(12, 52)).toBe("Strong AI signal to Inconclusive");
  });
});
