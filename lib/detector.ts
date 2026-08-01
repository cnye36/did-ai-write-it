/*
  Heuristic "Human Check" scorer. Pure and deterministic so it can run
  client-side on every keystroke and be unit-tested.

  Models the signals GPTZero-class detectors weight:
  - burstiness: variance in sentence length (humans vary, models flatten)
  - rhythm: runs of same-length sentences, uniform paragraph blocks
  - lexicon: stock AI vocabulary and constructions, old-gen and current-gen
  - structure: formal transition openers, sentence-starter anaphora,
    contrast-pivot pairs, pasted markdown formatting
  - voice: contractions, first person, concrete numbers vs. hedged generality
  - punctuation: em-dash density, tricolon ("x, y, and z") stacking

  Scores are 0-100 where higher = reads more human.
*/

export type FlagCategory =
  | "lexicon"
  | "punctuation"
  | "rhythm"
  | "structure"
  | "opener"
  | "hedging"
  | "cadence";

export interface Flag {
  start: number;
  end: number;
  text: string;
  reason: string;
  category: FlagCategory;
}

export interface MetricScore {
  id: "burstiness" | "rhythm" | "lexicon" | "punctuation" | "structure" | "cadence";
  label: string;
  score: number;
  detail: string;
}

export type Verdict = "human" | "mixed" | "ai";

export interface SentenceScore {
  text: string;
  start: number;
  end: number;
  score: number;
  verdict: Verdict;
  reasons: string[];
}

export interface DetectorResult {
  score: number;
  verdict: Verdict;
  metrics: MetricScore[];
  flags: Flag[];
  sentences: SentenceScore[];
  wordCount: number;
  sentenceCount: number;
  /** true when the sample is too short to score reliably */
  thin: boolean;
}

/*
  Scoring is PENALTY-ONLY and penalties SUM. Both are deliberate, and both are
  corrections to a scorer that badly under-called modern AI text.

  Penalty-only: no signal may ever add points. The old scorer gave credit for
  contractions, first person, and concrete numbers, which is exactly what
  "write it so it sounds human" prompting produces, so those signals had gone
  from weak to actively inverted: they rewarded well-prompted AI. A signal can
  now only be silent (0) or incriminating.

  Summed rather than averaged: a weighted mean let clean-but-blind signals vote
  a document up. Real observed case, Winston 0 vs our 76: punctuation and rhythm
  both caught it and were outvoted by three metrics that modern LLM output
  trivially satisfies. Summing means a clean signal contributes nothing instead
  of pulling the score up, and multiple tells compound the way they should.

  Weights are the tuning surface, and they are guesses until there is enough
  stored Winston data to fit them: run `scripts/calibrate-detector.ts` to
  measure agreement before changing any of them.
*/
const PENALTY_WEIGHTS: Record<MetricScore["id"], number> = {
  lexicon: 0.55,
  cadence: 0.5,
  punctuation: 0.45,
  structure: 0.4,
  rhythm: 0.35,
  burstiness: 0.25,
};

/*
  Residual skepticism knob, kept small now that penalty-only scoring builds the
  skew into the design rather than bolting it on afterward. A false "reads
  human" costs a user who ships thinking they're safe; a false "reads ai" costs
  a re-check.
*/
const AI_LEAN_PENALTY = 4;
const HUMAN_THRESHOLD = 70;
const AI_THRESHOLD = 45;

/** Same 0-100/higher-is-human scale as an external detector score, so callers
 *  scoring against a real API (Winston, etc.) can reuse these thresholds
 *  instead of duplicating the skew logic. */
export function verdictFor(score: number): Verdict {
  return score >= HUMAN_THRESHOLD ? "human" : score >= AI_THRESHOLD ? "mixed" : "ai";
}

function overlaps(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && aEnd > bStart;
}

/**
 * Reasons from a flag list whose range overlaps [start, end). Lets an
 * external sentence split (e.g. Winston's own, which carries no offsets and
 * doesn't line up with ours) still borrow our pattern-match explanations by
 * matching on character range instead of on the sentence object itself.
 */
export function reasonsForRange(flags: Flag[], start: number, end: number, limit = 3): string[] {
  const hits = flags.filter((f) => overlaps(start, end, f.start, f.end));
  return Array.from(new Set(hits.map((f) => f.reason))).slice(0, limit);
}

/*
  Per-sentence penalties, calibrated against the thresholds above: one stock AI
  phrase in a sentence must be enough to pull it out of "human" (100 - 32 - 4 =
  64, i.e. "mixed"), and two tells must reach "ai". These are deliberately
  harsher than the document-level weights because a single sentence has far
  less evidence in it, and an unflagged sentence in the editor reads to the
  user as "this one is fine, move on".
*/
const SENTENCE_PENALTY: Record<FlagCategory, number> = {
  lexicon: 32,
  punctuation: 40,
  structure: 32,
  rhythm: 24,
  opener: 20,
  hedging: 10,
  cadence: 28,
};

interface LexiconRule {
  pattern: RegExp;
  reason: string;
  /** contribution toward the lexicon hit rate; default 1, use 0.5 for words humans also use */
  weight?: number;
}

const LEXICON: LexiconRule[] = [
  // --- old-gen slop (2023-era, still worth catching in pasted archives) ---
  { pattern: /\bdelv(?:e|es|ed|ing)\b/gi, reason: "“Delve” is the single most-cited AI verb" },
  { pattern: /\btapestry\b/gi, reason: "“Tapestry” is a stock AI metaphor" },
  { pattern: /\bin today['’]s (?:fast-paced|digital|ever-changing|rapidly evolving|modern)\b/gi, reason: "Stock AI opener" },
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

  // --- current-gen templates (what a 2025+ model writes when it avoids the list above) ---
  { pattern: /\bone of the (?:most|biggest|best|key) [\w-]+ (?:advantages|benefits|ways|reasons|challenges|aspects|factors|steps|tools)?\b/gi, reason: "“One of the most ...” is a stock AI superlative frame", weight: 1 },
  { pattern: /\bone of the (?:biggest|most important|most effective|most powerful|key) \w+\b/gi, reason: "“One of the most ...” is a stock AI superlative frame" },
  { pattern: /\bplays? a (?:vital|key|central|crucial|critical|significant|major|pivotal|essential|important) (?:role|part)\b/gi, reason: "“Plays a vital role” is a stock AI construction" },
  { pattern: /\bis not without its\b/gi, reason: "“Is not without its challenges” is a stock AI hedge frame" },
  { pattern: /\bbest of both worlds\b/gi, reason: "Stock AI idiom" },
  { pattern: /\bhere to stay\b/gi, reason: "“Here to stay” is a stock AI closer" },
  { pattern: /\b(?:easier|faster|more \w+) than ever(?: before)?\b/gi, reason: "“Than ever before” is stock AI intensifier" },
  { pattern: /\bmore (?:important|relevant|critical) than ever\b/gi, reason: "“More important than ever” is stock AI intensifier" },
  { pattern: /\ba wide (?:range|variety|array) of\b/gi, reason: "“A wide range of” is high-frequency AI filler" },
  { pattern: /\bwhen it comes to\b/gi, reason: "“When it comes to” is high-frequency AI filler", weight: 0.5 },
  { pattern: /\bat the end of the day\b/gi, reason: "Stock AI idiom", weight: 0.5 },
  { pattern: /\bhere['’]s the thing\b/gi, reason: "“Here's the thing” is a stock AI pivot opener" },
  { pattern: /\bthe (?:truth|reality) is\b/gi, reason: "“The truth is ...” is a stock AI pivot opener", weight: 0.5 },
  { pattern: /\blet['’]s (?:be honest|face it|break (?:it|this) down|dive in)\b/gi, reason: "“Let's break it down” is a stock AI opener" },
  { pattern: /\bthe bottom line\b/gi, reason: "“The bottom line” is a stock AI closer", weight: 0.5 },
  { pattern: /\bat its core\b/gi, reason: "“At its core” is a stock AI frame", weight: 0.5 },
  { pattern: /\bin a world (?:where|of)\b/gi, reason: "“In a world where” is a stock AI opener" },
  { pattern: /\bgone are the days\b/gi, reason: "“Gone are the days” is a stock AI opener" },
  { pattern: /\bthat['’]s where [^.!?\n]{2,40} comes? in\b/gi, reason: "“That's where X comes in” is a stock AI construction" },
  { pattern: /\baims? to\b/gi, reason: "“Aims to” is high-frequency AI filler", weight: 0.5 },
  { pattern: /\bserves? as a\b/gi, reason: "“Serves as a” is high-frequency AI filler", weight: 0.5 },
  { pattern: /\b(?:is|are) designed to\b/gi, reason: "“Is designed to” is high-frequency AI filler", weight: 0.5 },
  { pattern: /\bfundamentally (?:chang|transform|reshap|alter)\w*\b/gi, reason: "“Fundamentally changed” is a stock AI intensifier" },
  { pattern: /\bit['’]s (?:also )?(?:important|worth) (?:to note|noting|to remember|to understand|remembering)\b/gi, reason: "“It's worth noting” is a stock AI hedge" },
  { pattern: /\bit is (?:also )?(?:important|worth) (?:to note|noting|to remember|to understand)\b/gi, reason: "“It is important to note” is a stock AI hedge" },
  { pattern: /\bevery single (?:time|day|one)\b/gi, reason: "“Every single time” is a stock AI intensifier", weight: 0.5 },
  { pattern: /\b(?:again and again|time and time again)\b/gi, reason: "Stock AI intensifier", weight: 0.5 },
  { pattern: /\bmore than just\b/gi, reason: "“More than just” is a stock AI pivot", weight: 0.5 },
  { pattern: /\b(?:is|are) no longer (?:just |about |whether )\b/gi, reason: "“No longer whether X but Y” is a stock AI frame" },
  { pattern: /\bmatters? more than (?:most people|you might|you'd) (?:realize|think|expect)\b/gi, reason: "“More than most people realize” is a stock AI frame" },
  { pattern: /\bBy [a-z]+ing\b[^.!?\n]{0,60}, (?:you|we|businesses|companies|organizations|teams) (?:can|will)\b/g, reason: "“By doing X, you can Y” is a stock AI construction" },
  { pattern: /\bleverag(?:e|es|ing|ed)\b/gi, reason: "“Leverage” as a verb is high-frequency AI filler", weight: 0.5 },
  { pattern: /\butiliz(?:e|es|ing|ed)\b/gi, reason: "“Utilize” where “use” would do is an AI tell", weight: 0.5 },
  { pattern: /\bcomprehensive\b/gi, reason: "“Comprehensive” is high-frequency AI filler", weight: 0.5 },
  { pattern: /\bempower(?:s|ing|ed)?\b/gi, reason: "“Empower” is a stock AI verb", weight: 0.5 },
  { pattern: /\bunleash(?:es|ing|ed)?\b/gi, reason: "“Unleash” is a stock AI verb" },
  { pattern: /\bmyriad\b/gi, reason: "“Myriad” is a stock AI noun" },
  { pattern: /\bplethora\b/gi, reason: "“Plethora” is a stock AI noun" },
  { pattern: /\btreasure trove\b/gi, reason: "Stock AI metaphor" },
  { pattern: /\bunwavering\b/gi, reason: "“Unwavering” is a stock AI adjective" },
  { pattern: /\bunparalleled\b/gi, reason: "“Unparalleled” is a stock AI adjective" },
  { pattern: /\binvaluable\b/gi, reason: "“Invaluable” is a stock AI adjective", weight: 0.5 },
  { pattern: /\bindispensable\b/gi, reason: "“Indispensable” is a stock AI adjective", weight: 0.5 },
  { pattern: /\bholistic\b/gi, reason: "“Holistic” is a stock AI adjective", weight: 0.5 },
  { pattern: /\bdouble[- ]edged sword\b/gi, reason: "Stock AI idiom" },
  { pattern: /\bkey takeaways?\b/gi, reason: "“Key takeaway” is a stock AI frame" },
  { pattern: /\bpro tip\b/gi, reason: "“Pro tip” is a stock AI frame", weight: 0.5 },
  { pattern: /\brapidly (?:transform|evolv|chang|grow)\w*\b/gi, reason: "“Rapidly transforming” is a stock AI intensifier" },
  { pattern: /\bincreasingly (?:popular|important|common|difficult|complex)\b/gi, reason: "“Increasingly popular” is a stock AI intensifier", weight: 0.5 },
  { pattern: /\bcontinues? to (?:evolve|grow|expand|improve|advance|shrink)\b/gi, reason: "“Continues to evolve” is a stock AI construction", weight: 0.5 },
  { pattern: /\bwill likely continue\b/gi, reason: "“Will likely continue” is a stock AI closer" },
  { pattern: /\b(?:another|a) (?:significant|key|major|important|notable) (?:advantage|benefit|aspect|factor|consideration)\b/gi, reason: "“Another significant advantage” is the machine essay paragraph opener" },
  { pattern: /\brole in shaping\b/gi, reason: "“Role in shaping” is a top AI trigram (writehuman 2026 corpus)" },
  { pattern: /\bis essential for\b/gi, reason: "“Is essential for” is a top AI trigram (writehuman 2026 corpus)", weight: 0.5 },
  { pattern: /\bin recent years\b/gi, reason: "“In recent years” is a formulaic AI opener" },
  { pattern: /\bthis (?:paper|article|post|essay) (?:introduces|explores|examines|discusses)\b/gi, reason: "“This paper introduces” is a formulaic AI opener" },
  // Capitalized "From" (not case-insensitive) rather than a true sentence-start
  // anchor: collectMatches scans the raw document text, not per-sentence text
  // like TRANSITION_OPENER does, so `^` here would only match after a literal
  // newline, missing this construction whenever it isn't the first sentence
  // in its paragraph, which is most of the time.
  { pattern: /\bFrom [^,.\n]{5,60} to [^,.\n]{5,60},/g, reason: "“From X to Y, ...” scope-broadening opener is a stock AI framing device", weight: 0.5 },
];

/*
  Frequency tells: ordinary words statistically over-represented in AI text
  (writehuman.ai 2026 corpus, 80k humanization pairs, ranked by G² against
  the humanized versions; see public/dataset.csv). Humans use every one of
  these, so no single hit means anything. AI text runs roughly 2.8 of them
  per 100 words against a human baseline near 1.2, so only the density above
  that baseline is penalized, and individual words are only flagged once the
  text clearly leans on them.
*/
const FREQUENCY_TELLS: LexiconRule[] = [
  { pattern: /\bensur(?:e|es|ing)(?: that)?\b/gi, reason: "“Ensuring” is the most AI-skewed word in the 2026 corpus" },
  { pattern: /\bhighlight(?:s|ing)\b/gi, reason: "“Highlights” as a verb is heavily AI-skewed" },
  { pattern: /\breflect(?:s|ing)\b/gi, reason: "“Reflects” is heavily AI-skewed" },
  { pattern: /\balign(?:s|ing)? with\b/gi, reason: "“Aligns with” is heavily AI-skewed" },
  { pattern: /\benabling\b/gi, reason: "“Enabling” is heavily AI-skewed" },
  { pattern: /\bsignificantly\b/gi, reason: "“Significantly” is an AI-skewed intensifier" },
  { pattern: /\beffectively\b/gi, reason: "“Effectively” is an AI-skewed intensifier" },
  { pattern: /\bconsistently\b/gi, reason: "“Consistently” is an AI-skewed intensifier" },
  { pattern: /\bcarefully\b/gi, reason: "“Carefully” is an AI-skewed adverb" },
  { pattern: /\bwidely\b/gi, reason: "“Widely” is an AI-skewed adverb" },
  { pattern: /\bstrongly\b/gi, reason: "“Strongly” is an AI-skewed adverb" },
  { pattern: /\bmeaningful\b/gi, reason: "“Meaningful” is an AI-skewed adjective" },
  { pattern: /\bstructured\b/gi, reason: "“Structured” is an AI-skewed adjective" },
  { pattern: /\bgrounded\b/gi, reason: "“Grounded” is an AI-skewed adjective" },
  { pattern: /\bbroader\b/gi, reason: "“Broader” is an AI-skewed adjective" },
  { pattern: /\bessential\b/gi, reason: "“Essential” is an AI-skewed adjective" },
  { pattern: /\bmaintaining\b/gi, reason: "“Maintaining” is an AI-skewed verb" },
  { pattern: /\bsupporting\b/gi, reason: "“Supporting” is an AI-skewed verb" },
  { pattern: /\bcontribut(?:e|es|ing) to\b/gi, reason: "“Contribute to” is AI-skewed" },
  { pattern: /\breduc(?:e|es|ing)\b/gi, reason: "“Reducing” is AI-skewed", weight: 0.5 },
  { pattern: /\binsights?\b/gi, reason: "“Insights” is AI-skewed", weight: 0.5 },
  { pattern: /\brather than\b/gi, reason: "“Rather than” is the strongest multi-word AI indicator in the 2026 corpus" },
  { pattern: /\bsuch as\b/gi, reason: "“Such as” is AI-skewed", weight: 0.5 },
  { pattern: /\bdirectly\b/gi, reason: "“Directly” is an AI-skewed adverb", weight: 0.5 },
];

/*
  The "not just X. It's Y" contrast pivot, in all its modern spellings. One
  such contrast is ordinary rhetoric; models stack them, so like tricolons
  they only count when they repeat.
*/
const CONTRAST_RULES: LexiconRule[] = [
  { pattern: /\b(?:it|this|that|he|she|AI)['’]s not (?:just|only|merely|simply|about) [^.!?\n]{3,60}?[,;.] (?:it|this|that)['’]s\b/gi, reason: "The “not just X, it's Y” pivot is a signature AI construction" },
  { pattern: /\b(?:isn|aren|doesn|don|won|wasn|weren)['’]t (?:just|only|merely|simply|about)\b/gi, reason: "The “isn't just X” pivot is a signature AI construction" },
  { pattern: /\b(?:isn|aren|doesn|don|won)['’]t\b[^.!?\n]{0,60}[.!?] (?:It|They|That|This)(?:['’]s|['’]re| is| are| will|['’]ll)\b/g, reason: "Back-to-back “not X. It's Y” contrast pair is a signature AI rhythm" },
  { pattern: /^(?:It|They|That|This) (?:doesn|don|isn|aren|won|didn)['’]t\.$/gm, reason: "The one-line “It doesn't.” contradiction is a stock AI punch" },
];

/** Formal transition sentence-openers. One is normal; a pileup is a tell. */
const TRANSITION_OPENER =
  /^(?:However|Furthermore|Moreover|Additionally|Ultimately|Overall|Finally|Firstly|Secondly|Thirdly|Consequently|Therefore|Thus|Likewise|Similarly|Meanwhile|Notably|Importantly|Crucially|Instead|In addition|In conclusion|In essence|In short|In fact|In summary|As a result|On the other hand|That said|Beyond that|More importantly|To address|To understand|To combat|The (?:first|second|third|next|final) step|For example|For instance|First|Second|Third|Lastly)\b[,:]?/;

/** Hedged-generality markers. Only flagged when the whole text leans on them. */
const HEDGES: RegExp[] = [
  /\bcan (?:help|lead to|make|create|improve|boost|reduce|enhance)\b/gi,
  /\b(?:may|might) (?:find|help|seem|be|feel|struggle|vary)\b/gi,
  /\b(?:often|typically|generally|usually|frequently)\b/gi,
  /\btends? to\b/gi,
  /\b(?:research|studies|science) (?:suggests?|shows?|indicates?|has shown|have shown)\b/gi,
  /\bhas been shown to\b/gi,
  /\b(?:many|most|some) (?:people|of us|experts|companies|businesses|workers|employees)\b/gi,
];

const clamp = (n: number, lo = 0, hi = 100) => Math.min(hi, Math.max(lo, n));

export interface Sentence {
  text: string;
  start: number;
  end: number;
  words: number;
}

/*
  A chunk ending in one of these was split at a period that isn't a sentence
  boundary, so it gets merged with the next chunk. Single letter + period
  covers initials and, by repeated merging, "e.g." / "i.e." / "U.S.".
*/
const MERGE_WITH_NEXT: RegExp[] = [
  /\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|St|vs|etc|approx|Inc|Ltd|Co|Corp|Dept|Univ|Fig|Vol|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\.$/i,
  /(?:^|\s)[A-Za-z]\.$/,
];

export function splitSentences(text: string): Sentence[] {
  // Terminal punctuation may be followed by closing quotes or brackets: without
  // that, `He said "go." Then left.` splits mid-quote into `He said "go.` and
  // `" Then left.`, which corrupts sentence-length variance and the per-sentence
  // report alike.
  const re = /[^.!?\n]+[.!?]*['"“”‘’)\]]*/g;
  const chunks: { start: number; end: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (!m[0].trim()) continue;
    const prev = chunks[chunks.length - 1];
    if (prev) {
      const prevText = text.slice(prev.start, prev.end).trimEnd();
      const abbreviation = MERGE_WITH_NEXT.some((r) => r.test(prevText));
      // "3.5" splits into "3." and "5 ..." without this.
      const decimal = /\d\.$/.test(prevText) && /^\s*\d/.test(m[0]);
      if (abbreviation || decimal) {
        prev.end = m.index + m[0].length;
        continue;
      }
    }
    chunks.push({ start: m.index, end: m.index + m[0].length });
  }

  const out: Sentence[] = [];
  for (const c of chunks) {
    const raw = text.slice(c.start, c.end);
    const trimmed = raw.trim();
    const words = trimmed.split(/\s+/).filter(Boolean).length;
    if (words === 0) continue;
    const leading = raw.length - raw.trimStart().length;
    out.push({
      text: trimmed,
      start: c.start + leading,
      end: c.start + leading + trimmed.length,
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

function coefficientOfVariation(nums: number[]): number {
  if (nums.length < 2) return 0;
  const mean = nums.reduce((a, b) => a + b, 0) / nums.length;
  return mean > 0 ? stdev(nums) / mean : 0;
}

function collectMatches(text: string, rules: LexiconRule[], category: FlagCategory): { flags: Flag[]; weighted: number } {
  const flags: Flag[] = [];
  let weighted = 0;
  for (const rule of rules) {
    rule.pattern.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = rule.pattern.exec(text)) !== null) {
      flags.push({
        start: m.index,
        end: m.index + m[0].length,
        text: m[0],
        reason: rule.reason,
        category,
      });
      weighted += rule.weight ?? 1;
      if (m.index === rule.pattern.lastIndex) rule.pattern.lastIndex++;
    }
  }
  return { flags, weighted };
}

/*
  Modern rhetorical tells: what's left once a model has been told to avoid the
  stock vocabulary. These are cadence and framing rather than word choice, and
  they are LOWER PRECISION than the lexicon rules by nature, since skilled human
  copywriters genuinely write this way.

  Two guards keep that in check. Each pattern must fire at least twice before it
  counts at all (the same density gating tricolons and contrast pivots already
  use), and the penalty scales with how many DIFFERENT patterns co-occur:
  leaning on one device is a style, stacking three or four is a template.
*/
const VERBS_OR_AUX =
  /\b(?:is|are|was|were|be|been|being|am|has|have|had|do|does|did|can|could|will|would|should|may|might|must|get|got|make|made|take|took|go|went|come|came|see|saw|know|knew|think|thought|want|need|keep|kept|run|ran|feel|felt|say|said|tell|told|and|or|but)\b/i;

interface CadencePattern {
  id: string;
  reason: string;
  hits: { start: number; end: number; text: string }[];
}

function detectCadence(text: string, sentences: Sentence[]): CadencePattern[] {
  const triad: CadencePattern["hits"] = [];
  const fragmentPunch: CadencePattern["hits"] = [];
  const reversal: CadencePattern["hits"] = [];
  const concessive: CadencePattern["hits"] = [];
  const colonSetup: CadencePattern["hits"] = [];

  for (let i = 0; i < sentences.length; i++) {
    const s = sentences[i];
    const hit = { start: s.start, end: s.end, text: s.text.slice(0, 60) };

    // "Great work, loyal clients, steady orders." Three stacked noun phrases,
    // no verb, no conjunction. A real tricolon uses "and"; this drops it.
    const commas = (s.text.match(/,/g) ?? []).length;
    if (commas === 2 && s.words <= 12 && !VERBS_OR_AUX.test(s.text)) triad.push(hit);

    // A long sentence chased by a very short one, over and over: the punchy
    // cadence models reach for when told to vary sentence length.
    if (i > 0 && sentences[i - 1].words >= 18 && s.words <= 5) fragmentPunch.push(hit);

    // "Not X, Y" / "wasn't X - it was Y".
    if (
      /^Not\s+[^.!?\n]{3,60}[—–,-]/i.test(s.text) ||
      /\b(?:isn['’]t|wasn['’]t|aren['’]t|weren['’]t|is not|was not)\b[^.!?\n]{3,60}[—–,-]\s*(?:it|they|that)\s+(?:is|was|are|were)\b/i.test(
        s.text
      )
    ) {
      reversal.push(hit);
    }

    // "She had the money coming. She just didn't have it yet."
    if (i > 0 && /^(?:She|He|It|They|We|I)\s+just\b/.test(s.text)) concessive.push(hit);

    // "Here's the thing that trips people up: ..." Setup, colon, payoff.
    const colon = s.text.indexOf(": ");
    if (colon > 0) {
      const before = s.text.slice(0, colon).split(/\s+/).filter(Boolean).length;
      const after = s.text.slice(colon + 1).split(/\s+/).filter(Boolean).length;
      if (before >= 4 && after >= 3) colonSetup.push(hit);
    }
  }

  return [
    { id: "triad", reason: "Stacked noun-phrase fragments with no verb: a signature AI cadence", hits: triad },
    { id: "fragmentPunch", reason: "Long sentence chased by a very short one, repeatedly: manufactured rhythm", hits: fragmentPunch },
    { id: "reversal", reason: "The “not X, it's Y” reversal used as a framing device", hits: reversal },
    { id: "concessive", reason: "Concessive reversal pairs (“... had it coming. She just didn't ...”)", hits: concessive },
    { id: "colonSetup", reason: "Setup-colon-payoff sentences stacked through the piece", hits: colonSetup },
  ].filter((p) => p.hits.length >= 2);
}

export function analyzeText(text: string): DetectorResult {
  const wordCount = countWords(text);
  const sentences = splitSentences(text);
  const flags: Flag[] = [];

  const thin = wordCount < 40 || sentences.length < 3;

  // --- Lexicon: stock phrases, old-gen and current-gen ---
  const lex = collectMatches(text, LEXICON, "lexicon");
  flags.push(...lex.flags);
  const lexHitsPer100 = wordCount > 0 ? (lex.weighted / wordCount) * 100 : 0;

  // Frequency tells only count as density above the human baseline, and only
  // get flagged (report + rewrite feedback) once the lean is unambiguous.
  const freq = collectMatches(text, FREQUENCY_TELLS, "lexicon");
  // flat allowance first (a couple of these words is just writing), then the
  // remaining density is measured against the human baseline
  const freqAdjusted = Math.max(0, freq.weighted - 1.5);
  const freqPer100 = wordCount > 0 ? (freqAdjusted / wordCount) * 100 : 0;
  const freqExcess = Math.max(0, freqPer100 - 1.0);
  const freqLeaning = !thin && freqPer100 >= 1.8;
  if (freqLeaning) flags.push(...freq.flags);

  // Hedged generality used to sit in the (now deleted) voice metric. It's the
  // one part of that signal still worth anything, so it folds in here.
  const hedgeFlags: Flag[] = [];
  for (const h of HEDGES) {
    h.lastIndex = 0;
    let hm: RegExpExecArray | null;
    while ((hm = h.exec(text)) !== null) {
      hedgeFlags.push({
        start: hm.index,
        end: hm.index + hm[0].length,
        text: hm[0],
        reason: "Hedged generality (can help, research suggests, many people) with no concrete detail",
        category: "hedging",
      });
    }
  }
  const hedgesPer100 = wordCount > 0 ? (hedgeFlags.length / wordCount) * 100 : 0;
  // sparse hedging is normal writing; only a lean on it counts
  const hedgeLeaning = !thin && hedgesPer100 >= 1.5;
  if (hedgeLeaning) flags.push(...hedgeFlags);

  const lexiconPenalty = clamp(
    lexHitsPer100 * 26 +
      (thin ? 0 : Math.min(freqExcess * 20, 45)) +
      (hedgeLeaning ? Math.min(hedgesPer100 * 6, 20) : 0)
  );

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

  // serial lists with up to three words per item, e.g. "improve efficiency,
  // increase productivity, and save valuable time"
  const triRe =
    /\b(?:[\w'’-]+ ){0,2}[\w'’-]+, (?:[\w'’-]+ ){0,2}[\w'’-]+, (?:[\w'’-]+, )*and (?:[\w'’-]+ ){0,2}[\w'’-]+\b/g;
  const triMatches: Flag[] = [];
  let tm: RegExpExecArray | null;
  while ((tm = triRe.exec(text)) !== null) {
    triMatches.push({
      start: tm.index,
      end: tm.index + tm[0].length,
      text: tm[0],
      reason: "Stacked serial lists (x, y, and z) read machine-written",
      category: "structure",
    });
  }
  // a couple of serial lists are normal writing; a pileup is the tell
  const triStacked = triMatches.length >= 3;
  if (triStacked) flags.push(...triMatches);
  flags.push(...punctFlags);

  const triPerSentence = sentences.length > 0 ? triMatches.length / sentences.length : 0;
  const punctuationPenalty = clamp(dashPer100 * 55 + (triStacked ? triPerSentence * 160 : 0));

  // --- Burstiness ---
  // Penalty-only: FLAT sentence length is evidence of a model, but varied
  // length is not evidence of a human. Models vary sentence length on request
  // now, so the old "reward high variance" direction was actively backwards.
  const lens = sentences.map((s) => s.words);
  const cv = coefficientOfVariation(lens);
  const burstinessPenalty = thin ? 0 : clamp(((0.45 - cv) / 0.35) * 100);

  // --- Rhythm: runs of near-identical sentence lengths + uniform paragraphs ---
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

  // Uniform paragraph blocks: the essay template (intro, N same-size bodies,
  // conclusion) produces paragraphs of near-identical length. Doc-level flag
  // only (zero-length range) so it informs the rewrite without smearing every
  // sentence in the report.
  const paraLens = text
    .split(/\n\s*\n+/)
    .map((p) => countWords(p))
    .filter((w) => w >= 15);
  const paraCv = coefficientOfVariation(paraLens);
  const uniformParagraphs = paraLens.length >= 4 && paraCv < 0.25;
  if (uniformParagraphs) {
    flags.push({
      start: 0,
      end: 0,
      text: "",
      reason: "Every paragraph is nearly the same length: the machine essay template",
      category: "rhythm",
    });
  }

  const rhythmPenalty = thin
    ? 0
    : clamp(uniformRuns * 30 + (cv < 0.25 ? 25 : 0) + (uniformParagraphs ? 30 : 0));

  // --- Structure: transition openers, anaphora, contrast pivots, markdown ---
  const openerFlags: Flag[] = [];
  for (const s of sentences) {
    const m = TRANSITION_OPENER.exec(s.text);
    if (m) {
      openerFlags.push({
        start: s.start,
        end: s.start + m[0].length,
        text: m[0],
        reason: "Formal transition openers (However, Additionally, Finally) are how models glue paragraphs",
        category: "opener",
      });
    }
  }
  // one formal transition is normal writing; a pileup is the tell
  if (openerFlags.length >= 2) flags.push(...openerFlags);
  const openerRatio =
    sentences.length > 0 ? Math.max(0, openerFlags.length - 1) / sentences.length : 0;

  let anaphoraRuns = 0;
  const firstWords = sentences.map((s) => (s.text.split(/\s+/)[0] ?? "").toLowerCase());
  let aStart = -1;
  for (let i = 1; i <= sentences.length; i++) {
    const same =
      i < sentences.length &&
      firstWords[i].length >= 2 && // exempt "I", legitimate in diary-style prose
      firstWords[i] === firstWords[i - 1];
    if (same) {
      if (aStart === -1) aStart = i - 1;
    } else {
      if (aStart !== -1 && i - aStart >= 3) {
        anaphoraRuns++;
        flags.push({
          start: sentences[aStart].start,
          end: sentences[i - 1].end,
          text: "",
          reason: "Three or more sentences in a row opening with the same word: machine anaphora",
          category: "structure",
        });
      }
      aStart = -1;
    }
  }

  // "This allows... These questions... This means..." as the glue between
  // sentences: models lean on demonstrative openers to chain claims.
  const demoStarts = sentences.filter((s) => /^(?:This|These) [a-z]/.test(s.text));
  const demoRatio = sentences.length > 0 ? demoStarts.length / sentences.length : 0;
  const demoExcess = Math.max(0, demoRatio - 0.09);
  if (demoStarts.length >= 3 && demoExcess > 0) {
    for (const s of demoStarts) {
      flags.push({
        start: s.start,
        end: s.start + s.text.split(/\s+/).slice(0, 2).join(" ").length,
        text: s.text.split(/\s+/).slice(0, 2).join(" "),
        reason: "Sentences chained with “This ...” or “These ...” openers: machine glue between claims",
        category: "opener",
      });
    }
  }

  const contrast = collectMatches(text, CONTRAST_RULES, "structure");
  // one contrast pivot is ordinary rhetoric; models stack them
  if (contrast.flags.length >= 2) flags.push(...contrast.flags);
  const contrastCount = contrast.flags.length >= 2 ? contrast.flags.length : 0;

  // Pasted ChatGPT markdown: headers and bold-led bullets
  const mdFlags: Flag[] = [];
  const mdRe = /^(?:#{1,4} .+|\s*[-*•] \*\*[^*\n]+\*\*.*)$/gm;
  let mdm: RegExpExecArray | null;
  while ((mdm = mdRe.exec(text)) !== null) {
    mdFlags.push({
      start: mdm.index,
      end: mdm.index + mdm[0].length,
      text: mdm[0].slice(0, 40),
      reason: "Markdown headers and bold-led bullets are the raw ChatGPT export format",
      category: "structure",
    });
  }
  flags.push(...mdFlags);

  const structurePenalty = thin
    ? 0
    : clamp(
        openerRatio * 300 +
          (demoStarts.length >= 3 ? demoExcess * 250 : 0) +
          anaphoraRuns * 25 +
          contrastCount * 15 +
          Math.min(mdFlags.length * 18, 45)
      );

  // --- Cadence: modern rhetorical scaffolding (see detectCadence) ---
  const cadencePatterns = thin ? [] : detectCadence(text, sentences);
  for (const p of cadencePatterns) {
    for (const h of p.hits) {
      flags.push({ start: h.start, end: h.end, text: h.text, reason: p.reason, category: "cadence" });
    }
  }
  const cadenceHits = cadencePatterns.reduce((n, p) => n + p.hits.length, 0);
  // Stacking different devices is the tell, so the count of distinct patterns
  // dominates; extra repetitions past the 2-hit gate add a little on top.
  const cadencePenalty = clamp(
    cadencePatterns.length * 20 + Math.max(0, cadenceHits - cadencePatterns.length * 2) * 6
  );

  // Metrics stay 0-100 where higher = cleaner, so the existing progress-bar UI
  // (components/detection-signals.tsx) still reads correctly. Only the
  // aggregation below changed: penalties sum instead of scores averaging.
  const metrics: MetricScore[] = [
    {
      id: "lexicon",
      label: "Vocabulary",
      score: Math.round(100 - lexiconPenalty),
      detail:
        lex.flags.length > 0 || freqLeaning
          ? [
              lex.flags.length > 0
                ? `${lex.flags.length} stock AI phrase${lex.flags.length > 1 ? "s" : ""} found`
                : null,
              freqLeaning
                ? `leans on AI-skewed vocabulary (${freqPer100.toFixed(1)} per 100 words)`
                : null,
            ]
              .filter(Boolean)
              .join(", ")
          : "No stock AI phrases",
    },
    {
      id: "structure",
      label: "Structure",
      score: Math.round(100 - structurePenalty),
      detail: thin
        ? "Not enough text to measure"
        : openerFlags.length >= 2 || demoStarts.length >= 3 || anaphoraRuns > 0 || contrastCount > 0 || mdFlags.length > 0
          ? [
              openerFlags.length >= 2 ? `${openerFlags.length} formal transition openers` : null,
              demoStarts.length >= 3 ? `${demoStarts.length} “This/These ...” sentence openers` : null,
              anaphoraRuns > 0 ? "repeated sentence starters" : null,
              contrastCount > 0 ? `${contrastCount} stacked contrast pivots` : null,
              mdFlags.length > 0 ? "raw markdown formatting" : null,
            ]
              .filter(Boolean)
              .join(", ")
          : "No templated structure",
    },
    {
      id: "cadence",
      label: "Cadence",
      score: Math.round(100 - cadencePenalty),
      detail: thin
        ? "Not enough text to measure"
        : cadencePatterns.length > 0
          ? `${cadencePatterns.length} stacked rhetorical pattern${cadencePatterns.length > 1 ? "s" : ""} (${cadenceHits} instances)`
          : "No manufactured rhythm",
    },
    {
      id: "burstiness",
      label: "Burstiness",
      score: Math.round(100 - burstinessPenalty),
      detail: thin
        ? "Not enough text to measure"
        : `Sentence length varies ${cv >= 0.5 ? "like human prose" : cv >= 0.3 ? "somewhat" : "very little"} (cv ${cv.toFixed(2)})`,
    },
    {
      id: "rhythm",
      label: "Rhythm",
      score: Math.round(100 - rhythmPenalty),
      detail:
        uniformRuns > 0 || uniformParagraphs
          ? [
              uniformRuns > 0
                ? `${uniformRuns} flat run${uniformRuns > 1 ? "s" : ""} of same-length sentences`
                : null,
              uniformParagraphs ? "uniform paragraph lengths" : null,
            ]
              .filter(Boolean)
              .join(", ")
          : "No flat sentence runs",
    },
    {
      id: "punctuation",
      label: "Punctuation",
      score: Math.round(100 - punctuationPenalty),
      detail:
        punctFlags.length > 0
          ? `${punctFlags.length} em dash${punctFlags.length > 1 ? "es" : ""}${triStacked ? `, ${triMatches.length} stacked lists` : ""}`
          : triStacked
            ? `${triMatches.length} stacked serial lists`
            : "Clean",
    },
  ];

  const totalPenalty =
    lexiconPenalty * PENALTY_WEIGHTS.lexicon +
    cadencePenalty * PENALTY_WEIGHTS.cadence +
    punctuationPenalty * PENALTY_WEIGHTS.punctuation +
    structurePenalty * PENALTY_WEIGHTS.structure +
    rhythmPenalty * PENALTY_WEIGHTS.rhythm +
    burstinessPenalty * PENALTY_WEIGHTS.burstiness;
  const score = clamp(Math.round(100 - totalPenalty - (thin ? 0 : AI_LEAN_PENALTY)));
  const verdict = verdictFor(score);

  flags.sort((a, b) => a.start - b.start);

  const sentenceScores: SentenceScore[] = sentences.map((s) => {
    const hits = flags.filter((f) => overlaps(s.start, s.end, f.start, f.end));
    const penalty = hits.reduce((sum, f) => sum + SENTENCE_PENALTY[f.category], 0);
    const sScore = clamp(100 - penalty - AI_LEAN_PENALTY);
    const reasons = Array.from(new Set(hits.map((f) => f.reason))).slice(0, 4);
    return {
      text: s.text,
      start: s.start,
      end: s.end,
      score: sScore,
      verdict: verdictFor(sScore),
      reasons,
    };
  });

  return {
    score,
    verdict,
    metrics,
    flags,
    sentences: sentenceScores,
    wordCount,
    sentenceCount: sentences.length,
    thin,
  };
}
