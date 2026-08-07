import { createServer, type Server } from "node:http";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { generateDetectionInsight } from "./detection-insight";

const TEXT =
  "The rollout improved response times across all three regions. Furthermore, the seamless integration unlocked operational efficiency.";

let server: Server;
let mockContent = "";
const received: { response_format?: unknown; messages?: { role: string; content: string }[] }[] = [];

beforeAll(async () => {
  server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      received.push(JSON.parse(body));
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-insight",
          object: "chat.completion",
          created: Date.now(),
          model: "mock",
          choices: [
            {
              index: 0,
              message: { role: "assistant", content: mockContent },
              finish_reason: "stop",
            },
          ],
        })
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const address = server.address();
  if (typeof address === "object" && address) {
    process.env.OPENAI_BASE_URL = `http://127.0.0.1:${address.port}/v1`;
  }
});

afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

beforeEach(() => {
  process.env.OPENAI_API_KEY = "test-key";
  received.length = 0;
  mockContent = JSON.stringify({
    summary: "The draft mixes concrete reporting with polished, generic transitions.",
    observations: [
      {
        excerpt: "Furthermore, the seamless integration unlocked operational efficiency.",
        explanation:
          "The formal transition and broad business language make this sentence less specific than the one before it.",
      },
    ],
  });
});

afterEach(() => {
  delete process.env.OPENAI_API_KEY;
});

describe("generateDetectionInsight", () => {
  it("requests grounded JSON and returns only observations quoted from the source", async () => {
    const insight = await generateDetectionInsight({
      text: TEXT,
      winston: {
        score: 18,
        sentences: [
          { text: "The rollout improved response times across all three regions.", score: 81 },
          {
            text: "Furthermore, the seamless integration unlocked operational efficiency.",
            score: 4,
          },
        ],
      },
    });

    expect(insight.observations).toHaveLength(1);
    expect(received).toHaveLength(1);
    expect(received[0].response_format).toEqual({ type: "json_object" });
    expect(received[0].messages?.[0].content).toContain("Never claim to know why");
    expect(received[0].messages?.[1].content).toContain("<submitted_text>");
  });

  it("rejects an explanation whose excerpt was invented", async () => {
    mockContent = JSON.stringify({
      summary: "A summary.",
      observations: [{ excerpt: "This sentence does not exist.", explanation: "Invented." }],
    });

    await expect(
      generateDetectionInsight({
        text: TEXT,
        winston: { score: 50, sentences: [] },
      })
    ).rejects.toThrow(/invalid response/i);
  });
});
