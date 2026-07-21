import { describe, expect, it, vi } from "vitest";
import { analyzeText } from "./detector";
import { runHumanizePipeline } from "./humanize";

const SLOP = `In today's fast-paced digital landscape, leveraging AI has become crucial for success. It is not just about working harder, it is about working smarter. Businesses must delve into these cutting-edge tools to unlock their full potential. Furthermore, this seamless integration fosters innovation, efficiency, and growth. Companies that embrace this robust technology will elevate their content to new heights. Moreover, it is a testament to how far automation has come.`;

const HUMAN = `Most teams pick up AI tools for the wrong reason. They want to move faster. Fine. But speed was never the problem, and anyone who has sat through a two hour meeting that could have been a paragraph already knows that. The teams getting real value are the ones who figured out which work they should stop doing entirely. That is a harder question. It also has nothing to do with software.`;

describe("runHumanizePipeline", () => {
  it("stops after one pass when the rewrite clears the target", async () => {
    const rewrite = vi.fn().mockResolvedValue(HUMAN);
    const out = await runHumanizePipeline(SLOP, rewrite, { targetScore: 70 });

    expect(rewrite).toHaveBeenCalledTimes(1);
    expect(out.text).toBe(HUMAN);
    expect(out.after.score).toBeGreaterThan(out.before.score);
    expect(out.passes).toEqual([
      { pass: 1, score: analyzeText(HUMAN).score, accepted: true, rejectedBecause: undefined },
    ]);
  });

  it("keeps the original when every rewrite scores worse", async () => {
    const rewrite = vi.fn().mockResolvedValue(SLOP + " " + SLOP.slice(0, 120));
    const out = await runHumanizePipeline(HUMAN, rewrite, { targetScore: 99, maxPasses: 2 });

    expect(out.text).toBe(HUMAN);
    expect(out.after.score).toBe(out.before.score);
    expect(out.passes.every((p) => !p.accepted)).toBe(true);
  });

  it("respects maxPasses when the target is never reached", async () => {
    const rewrite = vi.fn().mockResolvedValue(SLOP);
    await runHumanizePipeline(SLOP, rewrite, { targetScore: 100, maxPasses: 3 });
    expect(rewrite).toHaveBeenCalledTimes(3);
  });

  it("rejects a rewrite that drops most of the content", async () => {
    const rewrite = vi.fn().mockResolvedValue("Too short.");
    const out = await runHumanizePipeline(SLOP, rewrite, { targetScore: 99, maxPasses: 1 });

    expect(out.text).toBe(SLOP);
    expect(out.passes[0]).toMatchObject({ accepted: false, rejectedBecause: "length drifted" });
  });

  it("rejects an empty response without crashing", async () => {
    const rewrite = vi.fn().mockResolvedValue("   ");
    const out = await runHumanizePipeline(SLOP, rewrite, { targetScore: 99, maxPasses: 1 });

    expect(out.text).toBe(SLOP);
    expect(out.passes[0]).toMatchObject({ accepted: false, rejectedBecause: "empty response" });
  });

  it("skips the model entirely when the text already reads human", async () => {
    const rewrite = vi.fn();
    const out = await runHumanizePipeline(HUMAN, rewrite, { targetScore: 70 });

    expect(rewrite).not.toHaveBeenCalled();
    expect(out.text).toBe(HUMAN);
    expect(out.passes).toHaveLength(0);
  });

  it("feeds the detector's flags into each rewrite call", async () => {
    const rewrite = vi.fn().mockResolvedValue(HUMAN);
    await runHumanizePipeline(SLOP, rewrite, { targetScore: 70 });

    const ctx = rewrite.mock.calls[0][0];
    expect(ctx.pass).toBe(1);
    expect(ctx.text).toBe(SLOP);
    expect(ctx.result.flags.some((f: { text: string }) => /delve/i.test(f.text))).toBe(true);
  });
});
