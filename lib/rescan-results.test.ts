import { describe, expect, it } from "vitest";
import { buildRescanResults } from "./rescan-results";
import { recordProvenance, emptyProvenance } from "./provenance";
import type { RunVersion } from "./runs";

function version(id: string, text: string, sentences: { text: string; score: number }[]): RunVersion {
  return {
    id,
    input_text: text,
    word_count: text.split(/\s+/).length,
    score: null,
    result: { winston: { score: 50, sentences } },
    doc: null,
    created_at: new Date().toISOString(),
  };
}

describe("buildRescanResults", () => {
  it("reports an AI rewrite that improved the score", () => {
    const before = "The cat sat on the mat. It was a sunny day.";
    const after = "The cat sat on the mat. Sunlight poured through the window that morning.";
    const previous = version("v1", before, [
      { text: "The cat sat on the mat.", score: 40 },
      { text: "It was a sunny day.", score: 10 },
    ]);
    const next = version("v2", after, [
      { text: "The cat sat on the mat.", score: 40 },
      { text: "Sunlight poured through the window that morning.", score: 85 },
    ]);
    const provenance = recordProvenance(emptyProvenance(), before, after, "ai");

    const results = buildRescanResults(previous, next, provenance);

    expect(results.changes).toHaveLength(1);
    expect(results.changes[0]).toMatchObject({
      source: "ai",
      oldScore: 10,
      newScore: 85,
      delta: 75,
    });
    expect(results.bySource.ai).toEqual({ improved: 1, worsened: 0, unchanged: 0 });
  });

  it("reports a user edit that made the score worse", () => {
    const before = "The cat sat on the mat. It was a sunny day.";
    const after = "The cat sat on the mat. It was, in essence, a truly remarkable day.";
    const previous = version("v1", before, [
      { text: "The cat sat on the mat.", score: 40 },
      { text: "It was a sunny day.", score: 80 },
    ]);
    const next = version("v2", after, [
      { text: "The cat sat on the mat.", score: 40 },
      { text: "It was, in essence, a truly remarkable day.", score: 15 },
    ]);
    const provenance = recordProvenance(emptyProvenance(), before, after, "user");

    const results = buildRescanResults(previous, next, provenance);

    expect(results.changes[0]).toMatchObject({ source: "user", oldScore: 80, newScore: 15, delta: -65 });
    expect(results.bySource.user).toEqual({ improved: 0, worsened: 1, unchanged: 0 });
  });

  it("leaves untouched sentences out of the change list", () => {
    const before = "The cat sat on the mat. It was a sunny day.";
    const after = "The cat sat on the mat. It was a sunny day.";
    const previous = version("v1", before, [
      { text: "The cat sat on the mat.", score: 40 },
      { text: "It was a sunny day.", score: 80 },
    ]);
    const next = version("v2", after, [
      { text: "The cat sat on the mat.", score: 45 },
      { text: "It was a sunny day.", score: 80 },
    ]);
    const results = buildRescanResults(previous, next, emptyProvenance());
    expect(results.changes).toHaveLength(0);
  });

  it("marks a brand new sentence as an addition with no old score", () => {
    const before = "The cat sat on the mat.";
    const after = "The cat sat on the mat. It napped all afternoon.";
    const previous = version("v1", before, [{ text: "The cat sat on the mat.", score: 40 }]);
    const next = version("v2", after, [
      { text: "The cat sat on the mat.", score: 40 },
      { text: "It napped all afternoon.", score: 90 },
    ]);
    const provenance = recordProvenance(emptyProvenance(), before, after, "user");

    const results = buildRescanResults(previous, next, provenance);

    expect(results.changes[0]).toMatchObject({ oldScore: null, newScore: 90, delta: null });
    // No comparable delta, so it doesn't count toward improved/worsened/unchanged.
    expect(results.bySource.user).toEqual({ improved: 0, worsened: 0, unchanged: 0 });
  });

  it("falls back to \"unknown\" source when the change isn't tracked in provenance", () => {
    const before = "The cat sat on the mat. It was a sunny day.";
    const after = "The cat sat on the mat. It was a rainy afternoon.";
    const previous = version("v1", before, [
      { text: "The cat sat on the mat.", score: 40 },
      { text: "It was a sunny day.", score: 80 },
    ]);
    const next = version("v2", after, [
      { text: "The cat sat on the mat.", score: 40 },
      { text: "It was a rainy afternoon.", score: 70 },
    ]);
    const results = buildRescanResults(previous, next, emptyProvenance());
    expect(results.changes[0].source).toBe("unknown");
  });
});
