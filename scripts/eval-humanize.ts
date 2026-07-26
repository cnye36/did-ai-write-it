/*
  Humanizer eval harness. Runs a fixed corpus of known-AI samples through the
  real pipeline (same rewrite call as /api/humanize) and writes each rewrite to
  scripts/eval-output/ so it can be pasted into external detectors (GPTZero,
  Originality, Winston) by hand. Internal before/after scores and the pass log
  print to stdout, plus a Winston before/after score when WINSTON_API_KEY is set.

  Run: pnpm eval:humanize
  Needs OPENAI_API_KEY in .env.local (OPENAI_MODEL/OPENAI_BASE_URL optional).
  Set HUMANIZE_PROVIDER=anthropic (+ ANTHROPIC_API_KEY) to eval Claude instead.
*/

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runHumanizePipeline } from "../lib/humanize";
import { buildHumanizeSystem, buildHumanizeUser } from "../lib/prompts";
import { generateBestRewrite, getModelLabel, getProvider } from "../lib/rewrite";
import { winstonScoreOnly } from "../lib/winston";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

const SAMPLES: { slug: string; text: string }[] = [
  {
    slug: "real-estate-leads",
    text: `Artificial intelligence is rapidly transforming the real estate industry. AI agents are becoming increasingly popular because they help real estate professionals improve efficiency, increase productivity, and save valuable time. One of the most important ways AI agents help is by qualifying leads before a real estate agent speaks with them.

Lead qualification is an essential part of the sales process. However, it can also be time-consuming and repetitive. AI agents can automate this process by communicating with potential buyers and sellers through websites, messaging platforms, and other digital channels. This allows real estate agents to focus on more important business activities.

AI agents can ask prospective clients several important questions. For example, they can ask whether the individual is buying or selling, whether financing has been approved, what price range is being considered, which neighborhoods are preferred, and what timeline exists for moving. These questions provide valuable information that helps determine the quality of the lead.

Another significant advantage is automation. AI agents can automatically create CRM records, schedule appointments, send confirmation emails, distribute property listings, and organize customer information. This reduces administrative work while improving operational efficiency.

It is important to understand that AI agents are not intended to replace real estate professionals. Instead, they are designed to assist them by automating repetitive tasks and providing useful information. Human agents continue to provide expertise, relationship building, negotiation skills, and personalized customer service.

In conclusion, AI agents represent a valuable technology for real estate professionals. By automating lead qualification, improving response times, organizing customer information, and increasing operational efficiency, AI agents enable real estate agents to spend more time serving qualified clients.`,
  },
  {
    slug: "remote-work-essay",
    text: `Remote work has fundamentally changed how people think about their careers. What began as a temporary response to global events has become a permanent feature of the modern workplace. Companies that once required employees to be present five days a week now offer flexible arrangements, and many workers have come to value that flexibility as much as their salary.

One of the biggest advantages of remote work is the time it gives back. Without a daily commute, employees can spend more time with their families, pursue hobbies, or simply rest. This extra time often translates into higher job satisfaction and better overall well-being. In addition, remote work allows companies to hire talent from anywhere in the world rather than limiting their search to a single city.

However, remote work is not without its challenges. Communication can become more difficult when teams are spread across different time zones. Spontaneous conversations that once happened naturally in an office now require scheduled meetings. Some employees also report feelings of isolation, finding it harder to stay motivated without the energy of a shared workspace.

Ultimately, the future of work is likely to be defined by flexibility. Companies that embrace this shift will have access to a broader talent pool and a more satisfied workforce. Those that resist may find themselves struggling to attract and retain the best people.`,
  },
  {
    slug: "linkedin-content",
    text: `Most companies think more content means more results. It doesn't.

Here's the thing: your audience isn't asking for more. They're asking for better. Publishing five mediocre posts a week doesn't build trust. It erodes it.

What actually works? Consistency paired with quality. One genuinely useful post will outperform ten forgettable ones every single time. When you focus on solving real problems for real people, engagement follows naturally.

This isn't just a content strategy. It's a mindset shift. Instead of asking how much can we publish, ask how much value can we deliver.

The brands that win over the next five years won't be the loudest ones. They'll be the most trusted ones. And trust isn't built through volume. It's built through showing up, again and again, with something worth reading.`,
  },
];

const outDir = resolve(root, "scripts/eval-output");
mkdirSync(outDir, { recursive: true });

const system = buildHumanizeSystem();

async function main() {
  console.log(`provider: ${getProvider()} (${getModelLabel()})`);

  for (const sample of SAMPLES) {
    const outcome = await runHumanizePipeline(
      sample.text,
      ({ text, result, pass }) => generateBestRewrite(system, buildHumanizeUser(text, result, pass)),
      { scoreExternally: winstonScoreOnly }
    );

    const file = resolve(outDir, `${sample.slug}-${getProvider()}.txt`);
    writeFileSync(file, outcome.text);

    console.log(`\n=== ${sample.slug} ===`);
    console.log(`before: ${outcome.before.score} (${outcome.before.verdict})`);
    console.log(`after:  ${outcome.after.score} (${outcome.after.verdict})`);
    for (const p of outcome.passes) {
      const winston = p.externalScore != null ? ` winston=${p.externalScore}` : "";
      console.log(
        `  pass ${p.pass}: ${p.score}${winston}${p.accepted ? " accepted" : ` rejected (${p.rejectedBecause})`}`
      );
    }
    console.log(
      `winston before: ${outcome.externalBefore ?? "n/a"}  after: ${outcome.externalAfter ?? "n/a"}`
    );

    console.log(`wrote ${file}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
