import { createServer, type Server } from "node:http";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import OpenAI from "openai";
import { runHumanizePipeline } from "./humanize";
import { buildHumanizeSystem, buildHumanizeUser } from "./prompts";

/*
  Contract test against a mock OpenAI server. Verifies the request shape the
  route sends and the response shape it reads, so an SDK upgrade cannot break
  the humanize engine silently. No API key required.
*/

const SLOP = `In today's fast-paced digital landscape, leveraging AI has become crucial for success. Businesses must delve into these cutting-edge tools to unlock their full potential. Furthermore, this seamless integration fosters innovation, efficiency, and growth. Companies that embrace this robust technology will elevate their content to new heights.`;

const REWRITE = `Most teams reach for AI because they want to move faster. Fine. But speed was never the real problem, and anyone who has sat through a two hour meeting that could have been a paragraph already knows it. The teams seeing real gains figured out which work to stop doing. That question is harder, and no tool answers it for you.`;

// A deliberately worse second candidate: the best-of-n selection must skip it.
const WORSE_REWRITE = `In today's fast-paced digital landscape, businesses must delve into seamless AI tools. Furthermore, these robust solutions are crucial for success. Moreover, they elevate content and unlock potential for everyone involved in the process.`;

let server: Server;
let baseURL: string;
const received: {
  model?: string;
  messages?: { role: string; content: string }[];
  temperature?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  n?: number;
}[] = [];

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
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: WORSE_REWRITE },
              finish_reason: "stop",
            },
            { index: 1, message: { role: "assistant", content: REWRITE }, finish_reason: "stop" },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        })
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  if (typeof addr === "object" && addr) baseURL = `http://127.0.0.1:${addr.port}/v1`;
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

describe("humanize engine over the OpenAI SDK", () => {
  it("sends sampled best-of-n request and picks the better candidate", async () => {
    const client = new OpenAI({ apiKey: "test-key", baseURL });
    const system = buildHumanizeSystem();

    // mirrors the call in app/api/humanize/route.ts
    const { analyzeText } = await import("./detector");
    const outcome = await runHumanizePipeline(
      SLOP,
      async ({ text, result, pass }) => {
        const completion = await client.chat.completions.create({
          model: "gpt-5.5",
          messages: [
            { role: "system", content: system },
            { role: "user", content: buildHumanizeUser(text, result, pass) },
          ],
          temperature: 1.2,
          frequency_penalty: 0.4,
          presence_penalty: 0.2,
          n: 2,
        });
        const candidates = completion.choices
          .map((c) => c.message?.content?.trim() ?? "")
          .filter(Boolean);
        if (candidates.length === 0) return "";
        return candidates.reduce((best, c) =>
          analyzeText(c).score > analyzeText(best).score ? c : best
        );
      },
      { targetScore: 70 }
    );

    // best-of-n: the slop candidate at index 0 must lose to the clean one
    expect(outcome.text).toBe(REWRITE);
    expect(outcome.after.score).toBeGreaterThan(outcome.before.score);

    // request shape sent correctly
    expect(received).toHaveLength(1);
    expect(received[0].model).toBe("gpt-5.5");
    expect(received[0].messages?.map((m) => m.role)).toEqual(["system", "user"]);
    expect(received[0].temperature).toBe(1.2);
    expect(received[0].frequency_penalty).toBe(0.4);
    expect(received[0].presence_penalty).toBe(0.2);
    expect(received[0].n).toBe(2);

    // the prompt actually carries the detector's findings
    const userMsg = received[0].messages![1].content;
    expect(userMsg).toContain("delve");
    expect(userMsg).toContain("<draft>");
    expect(received[0].messages![0].content).toContain("Invent nothing, drop nothing");
  });
});
