/*
  Measures how well lib/detector.ts predicts Winston, using the per-sentence
  scores already stored on every saved detect run.

  The heuristic exists to ESTIMATE Winston in the editor between real scans, so
  agreement with Winston is its actual objective, not correctness in the
  abstract. This prints that agreement as a number so the weights in
  PENALTY_WEIGHTS can be tuned against evidence rather than intuition.

  Run: pnpm calibrate
  Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SECRET_KEY in .env.local. Read-only:
  it never writes to the database.
*/

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeText, verdictFor, type Verdict } from "../lib/detector";
import { locateWinstonSentences } from "../lib/winston-sentences";
import { createServiceClient } from "../lib/supabase/service";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split("\n")) {
  const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

interface Pair {
  text: string;
  winston: number;
  ours: number;
}

function mean(ns: number[]): number {
  return ns.length ? ns.reduce((a, b) => a + b, 0) / ns.length : 0;
}

function pearson(xs: number[], ys: number[]): number {
  if (xs.length < 2) return NaN;
  const mx = mean(xs);
  const my = mean(ys);
  let num = 0;
  let dx = 0;
  let dy = 0;
  for (let i = 0; i < xs.length; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    dx += (xs[i] - mx) ** 2;
    dy += (ys[i] - my) ** 2;
  }
  return dx === 0 || dy === 0 ? NaN : num / Math.sqrt(dx * dy);
}

async function main() {
  const supabase = createServiceClient();

  // Every stored detect result, run and version alike, carries Winston's own
  // document score plus its per-sentence breakdown.
  const [runs, versions] = await Promise.all([
    supabase.from("runs").select("input_text, score, result").eq("kind", "detect").limit(500),
    supabase.from("run_versions").select("input_text, score, result").limit(500),
  ]);

  if (runs.error) throw new Error(`runs query failed: ${runs.error.message}`);
  if (versions.error) throw new Error(`run_versions query failed: ${versions.error.message}`);

  const rows = [...(runs.data ?? []), ...(versions.data ?? [])] as {
    input_text: string;
    score: number | null;
    result: { winston?: { score: number; sentences?: { text: string; score: number }[] } };
  }[];

  const docPairs: Pair[] = [];
  const sentPairs: Pair[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const winston = row.result?.winston;
    if (!winston || !row.input_text) continue;

    const docKey = `d:${row.input_text.slice(0, 200)}:${winston.score}`;
    if (!seen.has(docKey)) {
      seen.add(docKey);
      docPairs.push({
        text: row.input_text,
        winston: winston.score,
        ours: analyzeText(row.input_text).score,
      });
    }

    /*
      Score sentences IN DOCUMENT CONTEXT, never standalone. Our signals are
      densities and rhythms measured across a whole piece, so `analyzeText` on
      one isolated sentence trips its own `thin` guard and returns ~100 for
      anything short. That's a property of the heuristic, not a bug to hide:
      it is why the editor anchors to Winston's real per-sentence scores
      (lib/winston-sentences.ts) instead of estimating them one at a time.
    */
    const doc = analyzeText(row.input_text);
    for (const located of locateWinstonSentences(row.input_text, winston.sentences ?? [])) {
      const key = `s:${located.text}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const overlapping = doc.sentences.filter(
        (o) => o.start < located.end && o.end > located.start
      );
      if (overlapping.length === 0) continue;
      const ours = Math.round(mean(overlapping.map((o) => o.score)));
      sentPairs.push({ text: located.text, winston: located.score, ours });
    }
  }

  if (docPairs.length === 0) {
    console.log("No stored Winston results found. Run some detect scans first.");
    return;
  }

  if (docPairs.length < 25) {
    console.log(
      `\nNOTE: only ${docPairs.length} scored documents available. Treat everything below as\n` +
        `directional, not a calibration. Weights should not be tuned on this little data.`
    );
  }

  for (const [label, pairs] of [
    ["DOCUMENT", docPairs],
    ["SENTENCE", sentPairs],
  ] as const) {
    if (pairs.length === 0) continue;
    const errs = pairs.map((p) => Math.abs(p.ours - p.winston));
    const bias = mean(pairs.map((p) => p.ours - p.winston));
    const r = pearson(
      pairs.map((p) => p.ours),
      pairs.map((p) => p.winston)
    );

    console.log(`\n=== ${label} (n=${pairs.length}) ===`);
    console.log(`  mean absolute error : ${mean(errs).toFixed(1)}`);
    console.log(`  bias (ours - winston): ${bias >= 0 ? "+" : ""}${bias.toFixed(1)} ${bias > 8 ? "(we read too human)" : bias < -8 ? "(we read too harsh)" : ""}`);
    console.log(`  correlation          : ${Number.isNaN(r) ? "n/a" : r.toFixed(3)}`);

    const verdicts: Verdict[] = ["human", "mixed", "ai"];
    const matrix = new Map<string, number>();
    for (const p of pairs) {
      const k = `${verdictFor(p.winston)}|${verdictFor(p.ours)}`;
      matrix.set(k, (matrix.get(k) ?? 0) + 1);
    }
    console.log("  verdict agreement (rows = winston, cols = ours):");
    console.log(`              ${verdicts.map((v) => v.padStart(6)).join("")}`);
    for (const w of verdicts) {
      const cells = verdicts.map((o) => String(matrix.get(`${w}|${o}`) ?? 0).padStart(6)).join("");
      console.log(`      ${w.padEnd(6)}${cells}`);
    }
    const agreed = pairs.filter((p) => verdictFor(p.ours) === verdictFor(p.winston)).length;
    console.log(`  verdict match: ${agreed}/${pairs.length} (${((agreed / pairs.length) * 100).toFixed(0)}%)`);

    // The cases worth reading: where we said "human" and Winston did not.
    const falseHuman = pairs
      .filter((p) => verdictFor(p.ours) === "human" && verdictFor(p.winston) !== "human")
      .sort((a, b) => b.ours - a.ours - (b.winston - a.winston))
      .slice(0, 5);
    if (falseHuman.length > 0) {
      console.log(`\n  worst false "reads human" (${falseHuman.length} shown):`);
      for (const p of falseHuman) {
        console.log(`    ours ${String(p.ours).padStart(3)} vs winston ${String(p.winston).padStart(3)}  ${JSON.stringify(p.text.slice(0, 90))}`);
      }
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
