import { createServer, type Server } from "node:http";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { runHumanizePipeline } from "./humanize";
import { buildHumanizeSystem, buildHumanizeUser } from "./prompts";
import { generateBestRewrite } from "./rewrite";

/*
  Contract test against a mock Anthropic server, calling the real production
  path (lib/rewrite.ts's generateBestRewrite) so an SDK upgrade or a
  rewrite.ts change cannot break the Anthropic branch silently. No API key
  required: ANTHROPIC_BASE_URL points at the mock (read by the SDK itself).
*/

const SLOP = `In today's fast-paced digital landscape, leveraging AI has become crucial for success. Businesses must delve into these cutting-edge tools to unlock their full potential. Furthermore, this seamless integration fosters innovation, efficiency, and growth. Companies that embrace this robust technology will elevate their content to new heights.`;

const REWRITE = `Most teams reach for AI because they want to move faster. Fine. But speed was never the real problem, and anyone who has sat through a two hour meeting that could have been a paragraph already knows it. The teams seeing real gains figured out which work to stop doing. That question is harder, and no tool answers it for you.`;

// A deliberately worse first candidate: the best-of-n selection must skip it.
const WORSE_REWRITE = `In today's fast-paced digital landscape, businesses must delve into seamless AI tools. Furthermore, these robust solutions are crucial for success. Moreover, they elevate content and unlock potential for everyone involved in the process.`;

let server: Server;
const received: {
  model?: string;
  system?: string;
  messages?: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
}[] = [];

beforeAll(async () => {
  let count = 0;
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      received.push(JSON.parse(body));
      const text = count === 0 ? WORSE_REWRITE : REWRITE;
      count++;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_mock",
          type: "message",
          role: "assistant",
          model: "mock",
          content: [{ type: "text", text }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1 },
        })
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  if (typeof addr === "object" && addr)
    process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${addr.port}`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.HUMANIZE_PROVIDER = "anthropic";
  // Best-of-n selection calls Winston when configured; keep this test on the
  // heuristic fallback path regardless of the shell's own environment.
  delete process.env.WINSTON_API_KEY;
  received.length = 0;
});

afterEach(() => {
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.HUMANIZE_PROVIDER;
});

describe("humanize engine over the Anthropic SDK", () => {
  it("fires two parallel sampled requests and picks the better candidate", async () => {
    const system = buildHumanizeSystem();

    const outcome = await runHumanizePipeline(
      SLOP,
      ({ text, result, pass }) => generateBestRewrite(system, buildHumanizeUser(text, result, pass)),
      { targetScore: 70 }
    );

    // best-of-n: the worse candidate must lose to the clean one
    expect(outcome.text).toBe(REWRITE);
    expect(outcome.after.score).toBeGreaterThan(outcome.before.score);

    // two parallel requests, no n parameter (Anthropic doesn't support one)
    expect(received).toHaveLength(2);
    for (const req of received) {
      expect(req.temperature).toBe(1);
      expect(req.max_tokens).toBeGreaterThan(0);
      expect(req.system).toContain("Invent nothing about the subject, drop nothing");
      expect(req.messages).toEqual([{ role: "user", content: expect.any(String) }]);
    }

    // the prompt actually carries the detector's findings
    const userMsg = received[0].messages![0].content;
    expect(userMsg).toContain("delve");
    expect(userMsg).toContain("<draft>");
  });
});
