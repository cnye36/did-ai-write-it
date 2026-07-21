/*
  Heuristic "Human Check" scorer. Pure and deterministic so it can run
  client-side on every keystroke and be unit-tested.

  Models the signals GPTZero-class detectors weight:
  - burstiness: variance in sentence length (humans vary, models flatten)
  - rhythm: runs of consecutive same-length sentences
  - lexicon: stock AI vocabulary and constructions
  - punctuation: em-dash density, tricolon ("x, y, and z") stacking

  Scores are 0-100 where higher = reads more human.
*/

export type FlagCategory = "lexicon" | "punctuation" | "rhythm" | "structure";

export interface Flag {
  start: number;
  end: number;
  text: string;
  reason: string;
  category: FlagCategory;
}

export interface MetricScore {
  id: "burstiness" | "rhythm" | "lexicon" | "punctuation";
  label: string;
  score: number;
  detail: string;
}

export type Verdict = "human" | "mixed" | "ai";

export interface DetectorResult {
  score: number;
  verdict: Verdict;
  metrics: MetricScore[];
  flags: Flag[];
  wordCount: number;
  sentenceCount: number;
  /** true when the sample is too short to score reliably */
  thin: boolean;
}

interface LexiconRule {
  pattern: RegExp;
  reason: string;
}

const LEXICON: LexiconRule[] = [
  { pattern: /\bdelv(?:e|es|ed|ing)\b/gi, reason: "“Delve” is the single most-cited AI verb" },
  { pattern: /\btapestry\b/gi, reason: "“Tapestry” is a stock AI metaphor" },
  { pattern: /\bin today['’]s (?:fast-paced|digital|ever-changing|rapidly evolving|modern)\b/gi, reason: "Stock AI opener" },
  { pattern: /\b(?:it|this|that|he|she|AI)['’]s not (?:just|about|only) [^.!?\n]{3,60}?[,;.] (?:it|this|that)['’]s\b/gi, reason: "The “not just X, it's Y” pivot is a signature AI construction" },
  { pattern: /\bgame[- ]?changer\b/gi, reason: "Marketing filler detectors weight heavily" },
  { pattern: /\bunlock(?:ing|s)? (?:the )?(?:power|potential|secrets?|value)\b/gi, reason: "Stock AI promise" },
  { pattern: /\bseamless(?:ly)?\b/gi, reason: "“Seamless” is high-frequency AI filler" },
  { pattern: /\belevate\b/gi, reason: "“Elevate” is high-frequency AI filler" },
  { pattern: /\bharness(?:ing|es)? the\b/gi, reason: "“Harness the” is a stock AI construction" },
  { pattern: /\b(?:digital|competitive|evolving|modern|business|content) landscape\b/gi, reason: "“Landscape” as abstract noun is an AI tell" },
  { pattern: /\bnavigat(?:e|ing) the\b/gi, reason: "“Navigating the ...” is a stock AI construction" },
  { pattern: /\bdive (?:deep(?:er)? )?into\b/gi, reason: "“Dive into” is high-frequency AI filler" },
  { pattern: /\ba testament to\b/gi, reason: "“A testament to” is a stock AI phrase" },
  { pattern: /\bboasts?\b/gi, reason: "“Boasts” is a stock AI verb" },
  { pattern: /\bmeticulous(?:ly)?\b/gi, reason: "“Meticulous” is a stock AI adjective" },
  { pattern: /\brealm\b/gi, reason: "“Realm” is a stock AI noun" },
  { pattern: /\bunderscor(?:e|es|ing|ed)\b/gi, reason: "“Underscores” is a stock AI verb" },
  { pattern: /\bembark(?:ing|ed)? on\b/gi, reason: "“Embark on” is a stock AI phrase" },
  { pattern: /\bcrucial\b/gi, reason: "“Crucial” is high-frequency AI filler" },
  { pattern: /\bpivotal\b/gi, reason: "“Pivotal” is high-frequency AI filler" },
  { pattern: /\brobust\b/gi, reason: "“Robust” is high-frequency AI filler" },
  { pattern: /\bfurthermore\b/gi, reason: "Formal connectives in casual copy read machine-written" },
  { pattern: /\bmoreover\b/gi, reason: "Formal connectives in casual copy read machine-written" },
  { pattern: /\bin conclusion\b/gi, reason: "“In conclusion” closers read machine-written" },
  { pattern: /\bwhether you['’]re a\b/gi, reason: "“Whether you're a X or a Y” is a stock AI frame" },
  { pattern: /\blook no further\b/gi, reason: "Stock AI sales line" },
  { pattern: /\bhidden gem\b/gi, reason: "Stock AI phrase" },
  { pattern: /\bactionable insights?\b/gi, reason: "Stock AI phrase" },
  { pattern: /\bsupercharge\b/gi, reason: "Stock AI verb" },
  { pattern: /\brevolutioniz(?:e|es|ing|ed)\b/gi, reason: "Stock AI verb" },
  { pattern: /\bcutting[- ]edge\b/gi, reason: "Stock AI adjective" },
  { pattern: /\bever[- ]evolving\b/gi, reason: "Stock AI adjective" },
  { pattern: /\bstreamlin(?:e|es|ing|ed)\b/gi, reason: "“Streamline” is high-frequency AI filler" },
  { pattern: /\bfoster(?:ing|s)? (?:a|an|the|collaboration|innovation|growth)\b/gi, reason: "“Fostering” is a stock AI verb" },
];

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

interface Sentence {
  text: string;
  start: number;
  end: number;
  words: number;
}

function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  const re = /[^.!?\n]+[.!?]*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const raw = m[0];
    const trimmed = raw.trim();
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    if (words === 0) continue;
    const leading = raw.length - raw.trimStart().length;
    out.push({
      text: trimmed,
      start: m.index + leading,
      end: m.index + leading + trimmed.length,
      words,
    });
  }
  return out;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

function stdev(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  const v = nums.reduce((a, b) => a + (b - mean) ** 2, 0) / (nums.length - 1);
  return Math.sqrt(v);
}

export function analyzeText(text: string): DetectorResult {
  const wordCount = countWords(text);
  const sentences = splitSentences(text);
  const flags: Flag[] = [];

  const thin = wordCount < 40 || sentences.length < 3;

  // --- Lexicon ---
  for (const rule of LEXICON) {
    rule.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.pattern.exec(text)) !== null) {
      flags.push({
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
        reason: rule.reason,
        category: "lexicon",
      });
      if (m.index === rule.pattern.lastIndex) rule.pattern.lastIndex++;
    }
  }
  const lexHitsPer100 = wordCount > 0 ? (flags.length / wordCount) * 100 : 0;
  const lexiconScore = clamp(100 - lexHitsPer100 * 28);

  // --- Punctuation: em dashes + tricolons ---
  const punctFlags: Flag[] = [];
  const dashRe = /[—–]/g;
  let dm: RegExpExecArray | null;
  while ((dm = dashRe.exec(text)) !== null) {
    punctFlags.push({
      start: dm.index,
      end: dm.index + 1,
      text: dm[0],
      reason: "Em dashes are the most-recognized AI punctuation tell",
      category: "punctuation",
    });
  }
  const dashPer100 = wordCount > 0 ? (punctFlags.length / wordCount) * 100 : 0;

  const triRe = /\b[\w'’-]+, [\w'’-]+, and [\w'’-]+\b/g;
  const triMatches: Flag[] = [];
  let tm: RegExpExecArray | null;
  while ((tm = triRe.exec(text)) !== null) {
    triMatches.push({
      start: tm.index,
      end: tm.index + tm[0].length,
      text: tm[0],
      reason: "Stacked rule-of-three lists (x, y, and z) read machine-written",
      category: "structure",
    });
  }
  // one tricolon is normal writing; repetition is the tell
  if (triMatches.length >= 2) flags.push(...triMatches);
  flags.push(...punctFlags);

  const triPerSentence = sentences.length > 0 ? triMatches.length / sentences.length : 0;
  const punctuationScore = clamp(
    100 - dashPer100 * 55 - (triMatches.length >= 2 ? triPerSentence * 160 : 0)
  );

  // --- Burstiness ---
  const lens = sentences.map((s) => s.words);
  const mean = lens.length ? lens.reduce((a, b) => a + b, 0) / lens.length : 0;
  const cv = mean > 0 ? stdev(lens) / mean : 0;
  // human prose usually lands around cv 0.5-0.8; model prose 0.15-0.35
  const burstinessScore = thin ? 60 : clamp((cv / 0.55) * 100);

  // --- Rhythm: runs of near-identical sentence lengths ---
  let uniformRuns = 0;
  let runStart = -1;
  for (let i = 1; i < sentences.length; i++) {
    const similar = Math.abs(sentences[i].words - sentences[i - 1].words) <= 2;
    if (similar) {
      if (runStart === -1) runStart = i - 1;
    } else {
      if (runStart !== -1 && i - runStart >= 3) {
        uniformRuns++;
        flags.push({
          start: sentences[runStart].start,
          end: sentences[i - 1].end,
          text: "",
          reason: "Several sentences in a row with near-identical length: flat machine rhythm",
          category: "rhythm",
        });
      }
      runStart = -1;
    }
  }
  if (runStart !== -1 && sentences.length - runStart >= 3) {
    uniformRuns++;
    flags.push({
      start: sentences[runStart].start,
      end: sentences[sentences.length - 1].end,
      text: "",
      reason: "Several sentences in a row with near-identical length: flat machine rhythm",
      category: "rhythm",
    });
  }
  const rhythmScore = thin ? 60 : clamp(100 - uniformRuns * 30 - (cv < 0.25 ? 25 : 0));

  const metrics: MetricScore[] = [
    {
      id: "burstiness",
      label: "Burstiness",
      score: Math.round(burstinessScore),
      detail: thin
        ? "Not enough text to measure"
        : `Sentence length varies ${cv >= 0.5 ? "like human prose" : cv >= 0.3 ? "somewhat" : "very little"} (cv ${cv.toFixed(2)})`,
    },
    {
      id: "rhythm",
      label: "Rhythm",
      score: Math.round(rhythmScore),
      detail:
        uniformRuns > 0
          ? `${uniformRuns} flat run${uniformRuns > 1 ? "s" : ""} of same-length sentences`
          : "No flat sentence runs",
    },
    {
      id: "lexicon",
      label: "Vocabulary",
      score: Math.round(lexiconScore),
      detail:
        flags.filter((f) => f.category === "lexicon").length > 0
          ? `${flags.filter((f) => f.category === "lexicon").length} stock AI phrase${flags.filter((f) => f.category === "lexicon").length > 1 ? "s" : ""} found`
          : "No stock AI phrases",
    },
    {
      id: "punctuation",
      label: "Punctuation",
      score: Math.round(punctuationScore),
      detail:
        punctFlags.length > 0
          ? `${punctFlags.length} em dash${punctFlags.length > 1 ? "es" : ""}${triMatches.length >= 2 ? `, ${triMatches.length} stacked lists` : ""}`
          : triMatches.length >= 2
            ? `${triMatches.length} stacked rule-of-three lists`
            : "Clean",
    },
  ];

  const score = Math.round(
    lexiconScore * 0.3 + burstinessScore * 0.25 + rhythmScore * 0.25 + punctuationScore * 0.2
  );

  const verdict: Verdict = score >= 70 ? "human" : score >= 45 ? "mixed" : "ai";

  flags.sort((a, b) => a.start - b.start);

  return {
    score,
    verdict,
    metrics,
    flags,
    wordCount,
    sentenceCount: sentences.length,
    thin,
  };
}
