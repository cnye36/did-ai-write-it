import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { scoreWithWinston, WINSTON_MIN_CHARS, isWinstonConfigured } from "./winston";

const LONG_TEXT = "This is a sample sentence for detection. ".repeat(10);

describe("Winston AI client", () => {
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

  it("reports unconfigured when no key is set", () => {
    delete process.env.WINSTON_API_KEY;
    expect(isWinstonConfigured()).toBe(false);
  });

  it("reports configured once a key is set", () => {
    process.env.WINSTON_API_KEY = "test-key";
    expect(isWinstonConfigured()).toBe(true);
  });

  it("skips the request and returns null when no key is configured", async () => {
    delete process.env.WINSTON_API_KEY;
    const result = await scoreWithWinston(LONG_TEXT);
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("skips the request and returns null when text is below Winston's minimum length", async () => {
    process.env.WINSTON_API_KEY = "test-key";
    expect(LONG_TEXT.length).toBeGreaterThan(WINSTON_MIN_CHARS);
    const result = await scoreWithWinston("Too short.");
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a bearer-authed request and parses a successful response", async () => {
    process.env.WINSTON_API_KEY = "test-key";
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        score: 82,
        sentences: [{ text: "This is a sample sentence for detection.", score: 90 }],
        readability_score: 61,
      }),
    });

    const result = await scoreWithWinston(LONG_TEXT);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.gowinston.ai/v2/ai-content-detection");
    expect(init.method).toBe("POST");
    expect(init.headers.Authorization).toBe("Bearer test-key");
    expect(JSON.parse(init.body)).toMatchObject({ text: LONG_TEXT, sentences: true });

    expect(result).toEqual({
      score: 82,
      sentences: [{ text: "This is a sample sentence for detection.", score: 90 }],
      readabilityScore: 61,
    });
  });

  it("returns null without throwing on a non-ok response", async () => {
    process.env.WINSTON_API_KEY = "test-key";
    fetchMock.mockResolvedValue({
      ok: false,
      status: 402,
      text: async () => "insufficient credits",
    });

    const result = await scoreWithWinston(LONG_TEXT);
    expect(result).toBeNull();
  });

  it("returns null without throwing on a network error", async () => {
    process.env.WINSTON_API_KEY = "test-key";
    fetchMock.mockRejectedValue(new Error("network down"));

    const result = await scoreWithWinston(LONG_TEXT);
    expect(result).toBeNull();
  });
});
