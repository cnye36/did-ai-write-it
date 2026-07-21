# CLAUDE.md


## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

## About this project

**letaiwriteit.com** is a **humanizer-first** AI writing tool. The primary product: paste or upload
AI-written text (from ChatGPT, Claude, etc.), get a free instant AI-detection score, then rewrite it
through a multi-pass engine until it reads human, with the meaning preserved. A secondary feature
lets users write on-brand content from scratch in their own learned voice.

Positioning: *"Let AI write it. Nobody will know."* Framing is deliberately **professional/marketing**
(LinkedIn posts, newsletters, marketing copy), **not** academic-cheating. It was pivoted from a
voice-first writer to a humanizer-first tool to compete with undetectable.ai / writehuman.ai /
gpthuman.ai, which are hot right now.

**Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4, pnpm, WSL2. Dual light/dark
themes, cobalt accent (`#2b47e0`, chosen to stand apart from the competitors' purple). Two AI
providers: **OpenAI** powers the humanize engine; **Anthropic** powers voice analysis + drafting.

## Commands

Run everything through WSL with nvm sourced (default WSL node is v18; project needs Node 24):
`wsl -d Ubuntu-24.04 --cd /home/cnye/let-ai-write-it-ideas/idea-1 -- bash -c 'source ~/.nvm/nvm.sh && <cmd>'`

- `pnpm dev` — dev server (Turbopack, port 3000). Next 16 refuses a **second** dev server for the
  same directory, so stop the first before starting another.
- `pnpm build` — production build
- `pnpm lint` — ESLint (flat config, `eslint-config-next`)
- `pnpm test` — Vitest once (`vitest run`). Single file: `pnpm vitest run lib/humanize.test.ts`
- **Use pnpm, never npm** (npm throws a bogus ERESOLVE against the pnpm tree). pnpm installs prompt
  interactively — prefix `CI=true` to auto-confirm.
- Keys in `.env.local` (copy from `.env.local.example`): `OPENAI_API_KEY` (humanize),
  `ANTHROPIC_API_KEY` (voice). Optional: `OPENAI_MODEL` (default `gpt-5.5`), `OPENAI_BASE_URL`
  (point at any OpenAI-compatible serverless provider — Together/DeepInfra/Groq — with no code change).
- Browser-pane **screenshots time out in this environment**; verify via page text / JS eval / network
  inspection instead.

## Architecture

**No database, no auth yet.** Voice profiles and drafts persist only in the browser `localStorage`
(`lib/voice.ts`: `loadProfile`/`saveProfile`, `loadDrafts`/`saveDraft`/`deleteDraft`). Text handed
from the landing page to the humanizer rides in `sessionStorage` under `HANDOFF_KEY`. Server routes
are stateless wrappers around the AI providers; the client always sends state in the request body.

**The humanize engine — `lib/humanize.ts` (the core product).** `runHumanizePipeline(original,
rewrite, opts)` is **provider-agnostic**: it takes a `rewrite` callback so the loop is unit-testable
and the model provider is swappable. Each pass rewrites, **re-scores the result with `analyzeText`,
and keeps it only if the score improved**; it stops at `targetScore` (default 85) or `maxPasses`
(default 3), so clean text costs zero model calls. Guards reject an empty response or a rewrite that
drifts outside 0.5x–2x the original word count (meaning-loss guard). Returns `{ text, before, after,
passes }`. `/api/humanize` wires this to OpenAI Chat Completions.

**`lib/detector.ts`** — pure, synchronous, unit-tested heuristic scorer (`analyzeText`), no network,
safe on every keystroke. Scores 0–100 where **higher = more human**, on four weighted metrics
(lexicon 30%, burstiness 25%, rhythm 25%, punctuation 20%) against a `LEXICON` of stock AI phrases,
sentence-length variance, uniform-length runs, em dashes, and stacked rule-of-three lists. Returns
`score`, `verdict`, `metrics`, and `flags` (with character offsets for highlighting). This is a
**heuristic proxy**, not a real detector like GPTZero — good directionally; real detector APIs are a
Phase-2 addition.

**API routes (`app/api/*/route.ts`)** are thin. All errors funnel through `errorResponse()` in
`lib/api-errors.ts` (shared by both providers): 503 for a missing key (`MissingKeyError`), 500
otherwise.
- `/api/humanize` — OpenAI (`lib/openai.ts`: `getOpenAI()`, `OPENAI_MODEL`). Body `{ text,
  fingerprint?, targetScore?, maxPasses? }` → `{ text, before, after, passes, model }`. Fingerprint
  is **optional** (the main flow has no voice profile).
- `/api/analyze-voice` — Anthropic (`lib/anthropic.ts`: `getClient()`, `MODEL`). Samples → a
  `VoiceFingerprint` JSON object.
- `/api/generate` — Anthropic, **streamed** `ReadableStream` of text deltas. Brief + fingerprint →
  a draft in the user's voice.

**Pages under `app/`:**
- `app/page.tsx` + `app/layout.tsx` — public landing (humanizer-first). Hero embeds
  `components/humanizer-hero.tsx`, a live paste/upload → client-side `analyzeText` score card with a
  locked "rewrite" CTA that hands text to `/app/humanize` via `sessionStorage`.
- `app/app/**` — product shell (no real auth) under `app/app/layout.tsx`, nav = Studio / Humanize /
  Write / Voice:
  - `app/app/humanize/page.tsx` — **the main product**: paste/upload → `/api/humanize` → before/after
    gauges, per-metric deltas, and the pass log. Optional "rewrite in my voice" if a profile exists.
  - `app/app/page.tsx` — dashboard (voice profile summary + saved drafts).
  - `app/app/onboarding/page.tsx` — collects samples, calls `/api/analyze-voice`, saves a
    `VoiceProfile`.
  - `app/app/write/page.tsx` — voice studio: pick a `ContentFormat`, `/api/generate` (streamed) draft,
    live `analyzeText` score, `saveDraft`.

**Prompts live in `lib/prompts.ts`**, not inline. `ANALYZE_VOICE_SYSTEM` → `VoiceFingerprint`.
`buildGenerateSystem` drafts in-voice. `buildHumanizeSystem(fingerprint | null)` accepts a **null**
fingerprint (plain-human register for the main flow) and `buildHumanizeUser(text, result, pass)`
feeds the detector's actual flags and weakest metrics back into each pass. All three share the
`ANTI_TELL_RULES` block (banned words, no em dashes, no "not just X, it's Y") — this is the **single
source of truth for AI tells** and must stay in sync with `LEXICON` in `lib/detector.ts`: edit one,
check the other, so generated/humanized text actually scores well against the detector grading it.

**Tests (14, all passing):** `lib/detector.test.ts` (6), `lib/humanize.test.ts` (7, pipeline logic),
`lib/openai.test.ts` (1, an SDK contract test against a mock server — pins the OpenAI **v6** request/
response shape so an SDK upgrade can't break the engine silently).

## Current state & how to proceed (handoff)

**Done and verified:** landing page, client-side detection, the full multi-pass humanize engine
(confirmed live against `gpt-5.5`: e.g. 50→80→100 over two passes), the voice studio, dual themes.

**Known debt / gaps (in priority order):**
1. **No auth, no DB, no billing** — the biggest gap. Free/paid word-quota gating can't exist until
   this lands. Likely next task: add auth + a DB (e.g. Supabase/Clerk + Postgres) and per-user
   monthly word quotas.
2. **`pnpm lint` is red — 4 errors, one shared cause.** React 19's `set-state-in-effect` rule fires
   in `theme-toggle.tsx`, `app/app/onboarding/page.tsx`, `app/app/write/page.tsx`, and
   `app/app/humanize/page.tsx` — all read `localStorage` via `setState` in a `useEffect`. Fix once
   with a shared `useLocalStorage`/`useSyncExternalStore` hook. (Three pre-date the humanizer work.)
3. **`components/live-demo.tsx` is dead code** (superseded by `humanizer-hero.tsx`); safe to delete.
4. **Detection is a heuristic proxy** — integrate real detector APIs (GPTZero/Originality) for paid
   "pass reports."
5. **Upload only handles `.txt`/`.md`** (client-side `file.text()`); add `.docx`/`.pdf`.
6. **Growth hooks** (referral codes, SEO landing pages) — how this category actually grows.

**Model/infra strategy:** no owned server, ever. Launch on OpenAI; scale on **serverless inference**
via `OPENAI_BASE_URL` (per-token, ~$0 fixed cost). Later, distill logged winning rewrites into a
LoRA fine-tune of a **7B–14B** open model (8B sweet spot — humanization is style-transfer, not
knowledge-heavy). The dataset (AI→human-passing pairs) is harvested for free from pipeline output.

## Styling & UI work

**Design discipline is mandatory for ALL UI work** — every new page, component, or redesign, not
just the landing page. In **Claude Code**, invoke the `design-taste-frontend` skill before writing
any UI. In **Cursor or any other tool** (which does not have that skill), follow the baked-in rules
below, which are that skill's essentials applied to this project.

Tailwind v4 via `@tailwindcss/postcss` (no `tailwind.config.*` — theme is defined with
`@theme inline` in `app/globals.css`). Design tokens are CSS custom properties (`--surface`,
`--raised`, `--ink`, `--muted`, `--faint`, `--line`, `--accent`, `--good`/`--warn`/`--bad` + `-soft`
variants) with light values on `:root` and overrides under `.dark`, toggled by `next-themes`
(`components/theme-provider.tsx`).

**Locked conventions — do not drift from these:**
- **Dual themes always.** Design and test in both light and dark from the start; the whole page is
  one theme (no section inverts mid-page). Use the CSS-variable tokens, never hardcoded colors.
- **One accent: cobalt (`--accent`, `#2b47e0`).** No AI-purple, no gradients-for-decoration, no
  second accent. Green/amber/red are reserved for score states (`--good`/`--warn`/`--bad`) only.
- **One radius system:** pill buttons (`rounded-full`), 16px cards (`rounded-2xl`), 10px inputs
  (`rounded-[10px]`).
- **Icons:** Phosphor (`@phosphor-icons/react`) only. Never hand-roll SVG icon paths.
- **No em dashes anywhere in UI copy** (the app is literally an em-dash detector). Use periods,
  commas, colons, or parentheses. This is also enforced in `ANTI_TELL_RULES`.
- **Real images, never div-based fake screenshots.** Local assets live in `public/img/`.
- **Motion** via `motion` (`components/reveal.tsx` for scroll reveals); always honor
  `prefers-reduced-motion`. Keep it subtle and motivated, not decorative.
- Reuse existing primitives — `ScoreGauge`, `HighlightedText`, `Reveal`, `ThemeToggle` — before
  building new ones. Match the tone and density of the existing pages.

## Working in this repo

Next.js is on a version ahead of most training data with breaking API changes. Before writing or
editing any Next.js-specific code (routing, config, data fetching, server actions, etc.), read the
relevant page under `node_modules/next/dist/docs/` first — do not assume older Next.js conventions
apply.
