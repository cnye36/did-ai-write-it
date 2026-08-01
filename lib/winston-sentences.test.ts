import { describe, expect, it } from "vitest";
import { locateWinstonSentences, resolveSentenceScores, verifiedCoverage } from "./winston-sentences";

const TEXT =
  "The migration took four days. We shipped it on a Friday, which was a mistake I will not repeat. Cleanup dragged on for a month after that.";

const WINSTON = [
  { text: "The migration took four days.", score: 12 },
  { text: "We shipped it on a Friday, which was a mistake I will not repeat.", score: 88 },
  { text: "Cleanup dragged on for a month after that.", score: 55 },
];

describe("locateWinstonSentences", () => {
  it("finds offsets that index back into the original text", () => {
    const located = locateWinstonSentences(TEXT, WINSTON);
    expect(located).toHaveLength(3);
    for (const s of located) {
      expect(TEXT.slice(s.start, s.end)).toBe(s.text);
    }
  });

  it("skips a sentence that isn't present rather than erroring", () => {
    const located = locateWinstonSentences(TEXT, [
      ...WINSTON,
      { text: "This sentence was never in the draft.", score: 3 },
    ]);
    expect(located).toHaveLength(3);
  });
});

describe("resolveSentenceScores", () => {
  it("uses Winston's real score for every untouched sentence", () => {
    const resolved = resolveSentenceScores(TEXT, WINSTON);
    expect(resolved.map((s) => s.score)).toEqual([12, 88, 55]);
    expect(resolved.every((s) => s.source === "verified")).toBe(true);
  });

  it("falls back to the heuristic only for the sentence that changed", () => {
    const edited = TEXT.replace("We shipped it on a Friday, which was a mistake I will not repeat.", "We shipped on a Friday. Bad idea.");
    const resolved = resolveSentenceScores(edited, WINSTON);

    const estimated = resolved.filter((s) => s.source === "estimated");
    const verified = resolved.filter((s) => s.source === "verified");

    // The two untouched sentences keep their real scores...
    expect(verified.map((s) => s.score).sort((a, b) => a - b)).toEqual([12, 55]);
    // ...and only the rewritten text is guessed at.
    expect(estimated.length).toBeGreaterThan(0);
    expect(estimated.every((s) => s.text.includes("Friday") || s.text.includes("Bad idea"))).toBe(true);
  });

  it("treats re-wrapped whitespace as unchanged", () => {
    const rewrapped = TEXT.replace(/ /g, "  ");
    const resolved = resolveSentenceScores(rewrapped, WINSTON);
    expect(resolved.every((s) => s.source === "verified")).toBe(true);
  });

  it("estimates everything when there is no prior scan", () => {
    const resolved = resolveSentenceScores(TEXT, null);
    expect(resolved.every((s) => s.source === "estimated")).toBe(true);
  });

  it("matches several of our sentences against one coarser Winston chunk", () => {
    // Real Winston responses merge short/adjacent sentences into one scored
    // unit instead of splitting the same way lib/detector.ts does.
    const text = "The business is fine. It is also broke. My friend runs a shop.";
    const merged = [{ text, score: 20 }];
    const resolved = resolveSentenceScores(text, merged);
    expect(resolved).toHaveLength(3);
    expect(resolved.every((s) => s.source === "verified")).toBe(true);
    expect(resolved.every((s) => s.score === 20)).toBe(true);
  });

  it("keeps matching later untouched sentences after a merged chunk was edited", () => {
    const original = "Short one. Short two. This sentence stands alone and is untouched.";
    const merged = [
      { text: "Short one. Short two.", score: 20 },
      { text: "This sentence stands alone and is untouched.", score: 80 },
    ];
    const edited = original.replace("Short one. Short two.", "A completely different sentence now.");
    const resolved = resolveSentenceScores(edited, merged);

    const last = resolved[resolved.length - 1];
    expect(last.text).toBe("This sentence stands alone and is untouched.");
    expect(last.source).toBe("verified");
    expect(last.score).toBe(80);
  });

  it("carries the verdict implied by the anchored score, not the heuristic's", () => {
    // 12/100 is "ai" even though this short, plain sentence trips no pattern
    // rule of ours: the whole point of anchoring is that Winston wins.
    const resolved = resolveSentenceScores(TEXT, WINSTON);
    expect(resolved[0].verdict).toBe("ai");
    expect(resolved[1].verdict).toBe("human");
  });
});

describe("verifiedCoverage", () => {
  it("counts how much of the draft still carries a real score", () => {
    expect(verifiedCoverage(resolveSentenceScores(TEXT, WINSTON))).toEqual({ verified: 3, total: 3 });
    expect(verifiedCoverage(resolveSentenceScores(TEXT, null))).toEqual({ verified: 0, total: 3 });
  });
});
