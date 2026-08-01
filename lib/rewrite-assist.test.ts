import { createServer, type Server } from "node:http";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { analyzeText } from "./detector";
import { rewriteWholeDocument, suggestRewrites } from "./rewrite-assist";

/*
  Contract test against a mock OpenAI server (same convention as
  lib/openai.test.ts): calls the real production functions rather than a
  hand-copied request, so an SDK upgrade can't break this silently. No API
  key required, OPENAI_BASE_URL points at the mock.
*/

const SLOP_SENTENCE = "Businesses must delve into these cutting-edge tools to unlock their full potential.";
const SLOP = `In today's fast-paced digital landscape, leveraging AI has become crucial for success. ${SLOP_SENTENCE} Furthermore, this seamless integration fosters innovation.`;

const REWRITE = "We started using these tools because we had to, not because they were exciting.";

let server: Server;
let mockChoices = [REWRITE];
const received: { model?: string; n?: number; messages?: { role: string; content: string }[] }[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      received.push(JSON.parse(body));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-mock",
          object: "chat.completion",
          created: Date.now(),
          model: "mock",
          choices: mockChoices.map((content, index) => ({
            index,
            message: { role: "assistant", content },
            finish_reason: "stop",
          })),
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        })
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  if (typeof addr === "object" && addr) process.env.OPENAI_BASE_URL = `http://127.0.0.1:${addr.port}/v1`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
  mockChoices = [REWRITE];
  received.length = 0;
});

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
});

describe("suggestRewrites", () => {
  it("sends the marked span, its flagged reasons, surrounding context, and n=3, returning every distinct candidate", async () => {
    mockChoices = [REWRITE, "We had to start using these tools, whether we liked it or not.", REWRITE];
    const start = SLOP.indexOf(SLOP_SENTENCE);
    const end = start + SLOP_SENTENCE.length;

    const result = await suggestRewrites({ fullText: SLOP, start, end });

    // The duplicate third choice collapses, so only 2 distinct suggestions survive.
    expect(result).toEqual([REWRITE, "We had to start using these tools, whether we liked it or not."]);
    expect(received).toHaveLength(1);
    expect(received[0].n).toBe(3);
    expect(received[0].messages?.map((m) => m.role)).toEqual(["system", "user"]);

    const userMsg = received[0].messages![1].content;
    expect(userMsg).toContain(`<<<${SLOP_SENTENCE}>>>`); // the exact span marked for replacement
    expect(userMsg).toContain("most-cited AI verb"); // delve's reason, inside the span
    // "seamless" (outside the span, in the trailing sentence) has its own reason,
    // "high-frequency AI filler" - it must not leak into this span's "why flagged" list.
    expect(userMsg).not.toContain("high-frequency AI filler");
  });
});

describe("rewriteWholeDocument", () => {
  it("makes a single call with the draft and its flagged problems, not a multi-pass loop", async () => {
    const result = analyzeText(SLOP);
    const rewritten = await rewriteWholeDocument({ text: SLOP, result });

    expect(rewritten).toBe(REWRITE);
    expect(received).toHaveLength(1); // single-shot, no candidate loop

    const userMsg = received[0].messages![1].content;
    expect(userMsg).toContain("<draft>");
    expect(userMsg).toContain("delve");
  });

  it("throws a clear error when the completion comes back empty", async () => {
    mockChoices = ["   "];
    const result = analyzeText(SLOP);
    await expect(rewriteWholeDocument({ text: SLOP, result })).rejects.toThrow(/rewrite failed/i);
  });
});
