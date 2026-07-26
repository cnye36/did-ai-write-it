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
      {
        pass: 1,
        score: analyzeText(HUMAN).score,
        externalScore: null,
        accepted: true,
        rejectedBecause: undefined,
      },
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

  describe("scoreExternally (real-detector accept/reject)", () => {
    it("rejects a candidate the external scorer scores worse, even though our heuristic prefers it", async () => {
      // HUMAN scores higher than SLOP on our own heuristic, so without an
      // external scorer this candidate would be accepted. Here the external
      // scorer says the opposite, and it must win.
      const rewrite = vi.fn().mockResolvedValue(HUMAN);
      const scoreExternally = vi.fn(async (text: string) => (text === SLOP ? 90 : 10));

      const out = await runHumanizePipeline(SLOP, rewrite, {
        targetScore: 99,
        maxPasses: 1,
        scoreExternally,
      });

      expect(scoreExternally).toHaveBeenCalledWith(SLOP); // externalBefore
      expect(scoreExternally).toHaveBeenCalledWith(HUMAN); // candidate
      expect(out.passes[0]).toMatchObject({ accepted: false, rejectedBecause: "no improvement" });
      expect(out.text).toBe(SLOP);
      expect(out.externalAfter).toBe(90); // externalBefore for SLOP, since nothing was accepted
    });

    it("stops early once the external score clears target, even if the heuristic score has not", async () => {
      const rewrite = vi.fn().mockResolvedValue(HUMAN);
      const scoreExternally = vi.fn().mockResolvedValueOnce(20).mockResolvedValueOnce(95);

      const out = await runHumanizePipeline(SLOP, rewrite, {
        targetScore: 90,
        maxPasses: 3,
        scoreExternally,
      });

      expect(rewrite).toHaveBeenCalledTimes(1);
      expect(out.text).toBe(HUMAN);
      expect(out.externalAfter).toBe(95);
    });

    it("falls back to the heuristic score when the external scorer returns null", async () => {
      const rewrite = vi.fn().mockResolvedValue(HUMAN);
      const scoreExternally = vi.fn().mockResolvedValue(null);

      const out = await runHumanizePipeline(SLOP, rewrite, { targetScore: 70, scoreExternally });

      expect(out.text).toBe(HUMAN);
      expect(out.passes[0]).toMatchObject({ accepted: true, externalScore: null });
      expect(out.externalAfter).toBeNull();
    });

    it("skips scoring a candidate rejected for length drift", async () => {
      const rewrite = vi.fn().mockResolvedValue("Too short.");
      const scoreExternally = vi.fn().mockResolvedValue(80);

      const out = await runHumanizePipeline(SLOP, rewrite, {
        targetScore: 99,
        maxPasses: 1,
        scoreExternally,
      });

      expect(out.passes[0]).toMatchObject({ accepted: false, rejectedBecause: "length drifted" });
      // called once for externalBefore, never for the rejected candidate
      expect(scoreExternally).toHaveBeenCalledTimes(1);
    });
  });
});
