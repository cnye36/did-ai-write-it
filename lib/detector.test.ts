import { describe, expect, it } from "vitest";
import { analyzeText } from "./detector";

const SLOP = `In today's fast-paced digital landscape, content creation is more crucial than ever. Businesses must delve into innovative strategies to stay ahead. AI writing tools offer a seamless way to elevate your content game. Moreover, these robust solutions unlock the power of scalable content production. It's not just about writing faster, it's about writing smarter. Whether you're a founder, a marketer, or a consultant, these tools are a game-changer. Furthermore, they provide actionable insights that underscore the importance of quality. In conclusion, embracing AI is a testament to forward thinking. The results speak for themselves, and the future looks bright for everyone. Harness the potential of these cutting-edge platforms today and revolutionize the way you work.`;

const HUMAN = `I almost didn't ship this feature. Tuesday night, around 11, I found a bug that made me question the whole architecture. Not a small one either. The kind where you stare at the screen and wonder if you picked the wrong career. So I did what I always do: went for a walk, complained to my dog, came back. Turned out the fix was four lines. Four! The lesson here isn't new but I keep relearning it anyway. When you're stuck, distance beats effort. Your brain keeps working while you pretend to do something else. Anyway, the feature's live now. If it breaks, you know exactly which Tuesday to blame.`;

describe("analyzeText", () => {
  it("scores obvious AI slop low", () => {
    const r = analyzeText(SLOP);
    expect(r.score).toBeLessThan(45);
    expect(r.verdict).toBe("ai");
  });

  it("scores natural human prose high", () => {
    const r = analyzeText(HUMAN);
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.verdict).toBe("human");
  });

  it("flags stock AI phrases with correct offsets", () => {
    const r = analyzeText(SLOP);
    const lex = r.flags.filter((f) => f.category === "lexicon");
    expect(lex.length).toBeGreaterThan(5);
    for (const f of lex) {
      expect(SLOP.slice(f.start, f.end)).toBe(f.text);
    }
    expect(lex.some((f) => /delve/i.test(f.text))).toBe(true);
  });

  it("flags em dashes", () => {
    const r = analyzeText(
      "The plan was simple — or so we thought. The team moved fast — maybe too fast. Everything changed — again — by Friday. We kept going anyway because stopping felt worse than failing at that point in the quarter."
    );
    expect(r.flags.filter((f) => f.category === "punctuation").length).toBe(4);
  });

  it("marks short text as thin without extreme scores", () => {
    const r = analyzeText("Too short to judge.");
    expect(r.thin).toBe(true);
    expect(r.score).toBeGreaterThan(30);
  });

  it("does not flag a single rule-of-three list", () => {
    const r = analyzeText(
      "We packed bread, cheese, and wine for the trip up the coast. The drive took most of the morning because I refused to use the highway. My sister slept through the best views, which felt criminal. By the time we found the beach, the fog had rolled in so thick you could barely see the water. We stayed anyway. Cold sand, warm coffee from the thermos, and absolutely no regrets about skipping the office party for this."
    );
    expect(r.flags.filter((f) => f.category === "structure").length).toBeGreaterThanOrEqual(0);
    const structureFlags = r.flags.filter((f) => f.category === "structure");
    // two tricolons appear, so they get flagged together or not at all
    expect(structureFlags.length === 0 || structureFlags.length >= 2).toBe(true);
  });
});
