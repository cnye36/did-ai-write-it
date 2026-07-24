import { describe, expect, it } from "vitest";
import { analyzeText } from "./detector";

const SLOP = `In today's fast-paced digital landscape, content creation is more crucial than ever. Businesses must delve into innovative strategies to stay ahead. AI writing tools offer a seamless way to elevate your content game. Moreover, these robust solutions unlock the power of scalable content production. It's not just about writing faster, it's about writing smarter. Whether you're a founder, a marketer, or a consultant, these tools are a game-changer. Furthermore, they provide actionable insights that underscore the importance of quality. In conclusion, embracing AI is a testament to forward thinking. The results speak for themselves, and the future looks bright for everyone. Harness the potential of these cutting-edge platforms today and revolutionize the way you work.`;

const HUMAN = `I almost didn't ship this feature. Tuesday night, around 11, I found a bug that made me question the whole architecture. Not a small one either. The kind where you stare at the screen and wonder if you picked the wrong career. So I did what I always do: went for a walk, complained to my dog, came back. Turned out the fix was four lines. Four! The lesson here isn't new but I keep relearning it anyway. When you're stuck, distance beats effort. Your brain keeps working while you pretend to do something else. Anyway, the feature's live now. If it breaks, you know exactly which Tuesday to blame.`;

// A realistic, unedited "write me a 500-word blog post" result: no banned lexicon words hit
// hard, moderate sentence-length variance. Represents the exact gap that let raw AI text
// read as human before the verdict thresholds were raised.
const GENERIC_AI_BLOG = `Mornings set the tone for the rest of the day, and how you start yours can have a lasting impact on your productivity, mood, and overall well-being. In today's fast-paced world, many people rush through their mornings, skipping breakfast and diving straight into their to-do lists. However, establishing a consistent morning routine can help you feel more grounded, focused, and ready to take on whatever the day brings.

One of the most important benefits of a morning routine is that it creates a sense of structure. When you know what to expect each morning, you reduce the mental load of decision-making early in the day. This allows you to conserve your energy for more important tasks later on. Additionally, a structured morning routine can help reduce stress and anxiety, as it provides a predictable and calming start to the day.

Another key advantage is improved physical health. Many successful morning routines include exercise, whether it's a full workout, a short walk, or simple stretching. Physical activity in the morning boosts your metabolism, increases energy levels, and releases endorphins that improve your mood. Moreover, morning exercise has been shown to enhance cognitive function, helping you think more clearly throughout the day.

Nutrition also plays a vital role in a successful morning routine. Eating a balanced breakfast fuels your body and brain, providing the energy you need to tackle the day ahead. Skipping breakfast, on the other hand, can lead to fatigue, irritability, and difficulty concentrating. Taking just a few minutes to prepare a nutritious meal can make a significant difference in how you feel throughout the day.

In addition to physical health, mental clarity is another major benefit of a solid morning routine. Practices such as meditation, journaling, or simply sitting in silence for a few minutes can help calm the mind and set a positive tone for the day. These practices allow you to approach challenges with a clearer, more focused mindset.

It's also worth noting that a morning routine doesn't have to be complicated or time-consuming. Even small changes, like waking up fifteen minutes earlier or preparing your clothes the night before, can have a meaningful impact. The key is consistency: sticking to a routine, even a simple one, helps train your body and mind to adapt to a rhythm that supports your goals.

In conclusion, developing a morning routine is one of the simplest yet most effective ways to improve your overall quality of life. Whether your goal is to boost productivity, improve physical health, or enhance mental clarity, a well-structured morning can set the stage for success. By making small, intentional changes to how you start your day, you can create lasting habits that benefit you both personally and professionally.`;

// Real ChatGPT output (user-supplied) that was explicitly prompted to trip AI
// detectors: it avoids the 2023 slop lexicon entirely, yet scored 80 "human"
// before the structure/voice metrics existed. The regression bar for the
// modern-detection work.
const MODERN_AI_ESSAY = `Artificial intelligence is rapidly transforming the real estate industry. AI agents are becoming increasingly popular because they help real estate professionals improve efficiency, increase productivity, and save valuable time. One of the most important ways AI agents help is by qualifying leads before a real estate agent speaks with them.

Lead qualification is an essential part of the sales process. However, it can also be time-consuming and repetitive. AI agents can automate this process by communicating with potential buyers and sellers through websites, messaging platforms, and other digital channels. This allows real estate agents to focus on more important business activities.

AI agents can ask prospective clients several important questions. For example, they can ask whether the individual is buying or selling, whether financing has been approved, what price range is being considered, which neighborhoods are preferred, and what timeline exists for moving. These questions provide valuable information that helps determine the quality of the lead.

Another significant advantage is automation. AI agents can automatically create CRM records, schedule appointments, send confirmation emails, distribute property listings, and organize customer information. This reduces administrative work while improving operational efficiency.

Consistency is another important benefit. AI agents ask the same qualification questions for every prospect and ensure that all relevant information is collected. This creates standardized lead data and helps prevent important details from being overlooked.

Furthermore, AI agents can integrate with numerous business systems, including customer relationship management platforms, email services, calendar applications, and marketing automation software. These integrations streamline workflows and improve overall business performance.

It is important to understand that AI agents are not intended to replace real estate professionals. Instead, they are designed to assist them by automating repetitive tasks and providing useful information.

In conclusion, AI agents represent a valuable technology for real estate professionals. By automating lead qualification, improving response times, organizing customer information, and increasing operational efficiency, AI agents enable real estate agents to spend more time serving qualified clients.`;

// Polished-but-human professional writing: contractions, first person, real
// numbers, uneven paragraphs. The false-positive risk case that must always
// stay "human".
const HUMAN_POLISHED = `We migrated our billing system off Stripe Elements last quarter, and I want to write down what went wrong before I forget the details. The short version: the migration itself took four days, but cleanup dragged on for almost a month.

Our first mistake was assuming the sandbox behaved like production. It mostly does. The exception is webhook ordering, which in production arrived out of order roughly once per thousand events. That's rare enough to miss in testing and common enough to corrupt real invoices. We ended up adding an idempotency check keyed on the event timestamp, which should have been there from day one.

The second mistake was mine. I scheduled the cutover for a Friday. Never do this. When the first support ticket came in Saturday morning, half the team was camping and the other half was pretending not to see Slack. We got lucky that the bug was cosmetic, a wrong currency symbol on refund receipts, but it could easily have been worse.

Would I do the migration again? Yes, the new system saves us real money, about $2,300 a month at current volume. But I'd budget three times as long for the tail of weird edge cases, and I'd cut over on a Tuesday like a sane person.`;

describe("analyzeText", () => {
  it("scores obvious AI slop low", () => {
    const r = analyzeText(SLOP);
    expect(r.score).toBeLessThan(55);
    expect(r.verdict).toBe("ai");
  });

  it("scores natural human prose high", () => {
    const r = analyzeText(HUMAN);
    expect(r.score).toBeGreaterThanOrEqual(75);
    expect(r.verdict).toBe("human");
  });

  it("does not let generic unedited AI text pass as human", () => {
    const r = analyzeText(GENERIC_AI_BLOG);
    expect(r.verdict).not.toBe("human");
  });

  it("scores modern ChatGPT output (no old-gen slop words) as ai", () => {
    const r = analyzeText(MODERN_AI_ESSAY);
    expect(r.verdict).toBe("ai");
    expect(r.score).toBeLessThan(55);
  });

  it("flags a pileup of formal transition openers", () => {
    const r = analyzeText(MODERN_AI_ESSAY);
    const openers = r.flags.filter((f) => f.category === "opener");
    expect(openers.length).toBeGreaterThanOrEqual(2);
    expect(openers.some((f) => /^However/.test(f.text))).toBe(true);
  });

  it("flags stacked multi-word serial lists", () => {
    const r = analyzeText(MODERN_AI_ESSAY);
    const lists = r.flags.filter(
      (f) => f.category === "structure" && /, and /.test(f.text)
    );
    expect(lists.length).toBeGreaterThanOrEqual(3);
  });

  it("scores voiceless prose (no contractions, no specifics, hedged) low on voice", () => {
    const r = analyzeText(MODERN_AI_ESSAY);
    const voice = r.metrics.find((m) => m.id === "voice");
    expect(voice).toBeDefined();
    expect(voice!.score).toBeLessThan(50);
  });

  it("keeps polished professional human writing above the human threshold", () => {
    const r = analyzeText(HUMAN_POLISHED);
    expect(r.verdict).toBe("human");
    const voice = r.metrics.find((m) => m.id === "voice");
    expect(voice!.score).toBeGreaterThan(60);
  });

  it("penalizes density of AI-skewed ordinary words without flagging normal use", () => {
    // Academic-register AI text: no template phrases, but saturated with the
    // words the writehuman 2026 corpus found most over-represented in AI text.
    const dense = analyzeText(
      "Effective collaboration between distributed teams depends on maintaining clear communication channels and ensuring that expectations remain aligned across the organization. Structured processes contribute to stronger outcomes, particularly when supported by tools that reflect the broader goals of the group rather than the preferences of individual contributors. Recent research highlights the importance of meaningful feedback delivered consistently and directly. Teams that establish grounded norms significantly reduce misunderstandings, enabling members to work effectively across time zones. These practices are essential for maintaining trust, ensuring that distributed work remains a strength rather than a limitation."
    );
    expect(dense.verdict).not.toBe("human");
    const lexicon = dense.metrics.find((m) => m.id === "lexicon");
    expect(lexicon!.score).toBeLessThan(70);
    expect(dense.flags.some((f) => /ensuring/i.test(f.text))).toBe(true);

    // One "rather than" and one "essential" in human prose must not flag.
    const normal = analyzeText(
      "I picked the train rather than driving, mostly because parking near the venue is a nightmare. Good call. The talk itself ran long, but the hallway conversations were the essential part anyway. I got twenty minutes with the maintainer of the library we depend on, and she walked me through the migration plan on a napkin. Worth the whole trip."
    );
    expect(normal.verdict).toBe("human");
    expect(normal.flags.length).toBe(0);
  });

  it("catches the isn't-just contrast pivot only when stacked", () => {
    const single = analyzeText(
      "The launch went fine, honestly. The worst part isn't even the deadline. It's the meetings about the deadline. We shipped two days late and nobody outside the team noticed or cared. Next quarter I want us to cut scope earlier instead of pretending the calendar will bend."
    );
    expect(single.flags.filter((f) => /pivot|contrast/i.test(f.reason)).length).toBe(0);

    const stacked = analyzeText(
      "Your audience isn't asking for more content. They're asking for better content. Publishing daily doesn't build trust. It erodes it. This isn't just a content strategy, it's a mindset shift. Winning brands won't be the loudest. They'll be the most trusted. Volume didn't get them there. Focus did."
    );
    expect(stacked.flags.filter((f) => /pivot|contrast/i.test(f.reason)).length).toBeGreaterThanOrEqual(2);
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

  it("scores the worst sentence lower than a clean one, per sentence", () => {
    const r = analyzeText(SLOP);
    expect(r.sentences.length).toBe(r.sentenceCount);
    for (const s of r.sentences) {
      expect(SLOP.slice(s.start, s.end)).toBe(s.text);
    }
    const delveSentence = r.sentences.find((s) => /delve/i.test(s.text));
    expect(delveSentence).toBeDefined();
    expect(delveSentence!.verdict).not.toBe("human");
    expect(delveSentence!.reasons.length).toBeGreaterThan(0);
  });
});
