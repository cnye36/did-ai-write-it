import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { pickBest } from "./rewrite";

const LONG_A = "Alpha candidate text for detection purposes. ".repeat(10);
const LONG_B = "Beta candidate text for detection purposes. ".repeat(10);

describe("pickBest", () => {
  const originalKey = process.env.WINSTON_API_KEY;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    if (originalKey === undefined) delete process.env.WINSTON_API_KEY;
    else process.env.WINSTON_API_KEY = originalKey;
  });

  it("returns the only candidate without calling Winston", async () => {
    delete process.env.WINSTON_API_KEY;
    const result = await pickBest([LONG_A]);
    expect(result).toBe(LONG_A);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("falls back to the heuristic when Winston is unconfigured", async () => {
    delete process.env.WINSTON_API_KEY;
    // LONG_A repeats a plain sentence with zero variance: worse burstiness/rhythm
    // than a candidate with mixed sentence lengths, so the heuristic picks B.
    const varied = "Short one. " + "A considerably longer sentence with real variation in it. ".repeat(5);
    const result = await pickBest([LONG_A, varied]);
    expect(result).toBe(varied);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("prefers the candidate Winston scores higher, even when it isn't first", async () => {
    process.env.WINSTON_API_KEY = "test-key";
    fetchMock.mockImplementation(async (_url: string, init: { body: string }) => {
      const { text } = JSON.parse(init.body);
      const score = text === LONG_A ? 20 : 90;
      return {
        ok: true,
        json: async () => ({ score, sentences: [] }),
      };
    });

    const result = await pickBest([LONG_A, LONG_B]);

    expect(result).toBe(LONG_B);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to the heuristic when Winston fails for any candidate", async () => {
    process.env.WINSTON_API_KEY = "test-key";
    let call = 0;
    fetchMock.mockImplementation(async () => {
      call++;
      if (call === 1) return { ok: true, json: async () => ({ score: 20, sentences: [] }) };
      return { ok: false, status: 500, text: async () => "boom" };
    });

    // Neither candidate has a full set of Winston scores (one failed), so
    // this must not throw, and must fall back to a heuristic decision.
    const result = await pickBest([LONG_A, LONG_B]);
    expect([LONG_A, LONG_B]).toContain(result);
  });
});
