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

let server: Server;
let baseURL: string;
const received: { model?: string; messages?: { role: string; content: string }[] }[] = [];

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
            { index: 0, message: { role: "assistant", content: REWRITE }, finish_reason: "stop" },
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
  it("sends system + user messages and reads back the rewrite", async () => {
    const client = new OpenAI({ apiKey: "test-key", baseURL });
    const system = buildHumanizeSystem();

    const outcome = await runHumanizePipeline(
      SLOP,
      async ({ text, result, pass }) => {
        const completion = await client.chat.completions.create({
          model: "gpt-5.5",
          messages: [
            { role: "system", content: system },
            { role: "user", content: buildHumanizeUser(text, result, pass) },
          ],
        });
        return completion.choices[0]?.message?.content ?? "";
      },
      { targetScore: 70 }
    );

    // response shape read correctly
    expect(outcome.text).toBe(REWRITE);
    expect(outcome.after.score).toBeGreaterThan(outcome.before.score);

    // request shape sent correctly
    expect(received).toHaveLength(1);
    expect(received[0].model).toBe("gpt-5.5");
    expect(received[0].messages?.map((m) => m.role)).toEqual(["system", "user"]);

    // the prompt actually carries the detector's findings
    const userMsg = received[0].messages![1].content;
    expect(userMsg).toContain("delve");
    expect(userMsg).toContain("<draft>");
    expect(received[0].messages![0].content).toContain("keeping the meaning exactly intact");
  });
});
