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

**letaiwriteit.com** is a **humanizer-first** AI writing tool, and only that. The product: paste or
upload AI-written text (from ChatGPT, Claude, etc.), get a free instant AI-detection score, then
rewrite it through a multi-pass engine until it reads human, with the meaning preserved.

Positioning: *"Let AI write it. Nobody will know."* Framing is deliberately **professional/marketing**
(LinkedIn posts, newsletters, marketing copy), **not** academic-cheating. It was pivoted from a
voice-first writer to a humanizer-first tool to compete with undetectable.ai / writehuman.ai /
gpthuman.ai, which are hot right now. A later pivot (2026-07-22) removed the voice/on-brand-drafting
feature entirely: none of those competitors lead with a "write from scratch" feature either, they're
all paste-in-content → detect → rewrite, so the bet is two components done extremely well — a
detector credible enough to flag what real detectors flag, and a humanizer aggressive enough to
clear them — rather than splitting focus. A from-scratch "guaranteed pass" voice feature is a
possible v2, not scoped (see `docs/BUILD_PLAN.md`).

**Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4, pnpm, WSL2. Dual light/dark
themes, cobalt accent (`#2b47e0`, chosen to stand apart from the competitors' purple). **OpenAI**
powers the humanize engine; no other model provider is in use.

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
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`/`SUPABASE_SECRET_KEY` (auth/DB),
  `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`/`STRIPE_PRICE_{LITE,PRO,STUDIO}_{MONTHLY,ANNUAL}`
  (billing, six price IDs total). Optional: `OPENAI_MODEL` (default `gpt-5.5`), `OPENAI_BASE_URL`
  (point at any OpenAI-compatible serverless provider — Together/DeepInfra/Groq — with no code
  change), `DEV_BYPASS_EMAIL` (one account exempt from all word quotas).
- Browser-pane **screenshots time out in this environment**; verify via page text / JS eval / network
  inspection instead.

## Architecture

**Supabase auth + Postgres for accounts/billing.** `/app/**` is gated by `proxy.ts`
(`lib/supabase/proxy.ts`) and every API route independently calls `requireUser()`
(`lib/supabase/auth.ts`) — defense in depth, since the proxy alone wouldn't stop a direct API call.
`profiles` (plan, Stripe IDs) and `usage` (monthly word counter, rolled over by comparing
`period_start` to the current month, not a cron job) live in Postgres (`supabase/migrations/`). Text
handed from the landing page to the humanizer rides in `sessionStorage` under `HANDOFF_KEY`
(`lib/handoff.ts`).

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
`lib/api-errors.ts`: 503 for a missing key (`MissingKeyError`), 500 otherwise.
- `/api/humanize` — OpenAI (`lib/openai.ts`: `getOpenAI()`, `OPENAI_MODEL`). Requires auth. Body
  `{ text, targetScore?, maxPasses? }` → `{ text, before, after, passes, model, usage }`. Enforces
  `PLAN_MAX_OUTPUT_WORDS` (per-request cap) then the monthly `PLAN_LIMITS` quota (`lib/usage.ts`),
  both skipped for the `DEV_BYPASS_EMAIL` account; a passing request calls the `increment_usage`
  Postgres RPC.
- `/api/stripe/checkout`, `/api/stripe/portal` — requires auth; create a Stripe Checkout/Billing
  Portal session (`lib/stripe.ts`) and return `{ url }` for the client to redirect to.
- `/api/stripe/webhook` — no auth (Stripe calls it directly); verifies the signature and syncs
  `profiles.plan`/`stripe_customer_id`/`stripe_subscription_id` via the service-role client
  (`lib/supabase/service.ts`, the only route that bypasses RLS).

**Pages under `app/`:**
- `app/page.tsx` + `app/layout.tsx` — public landing (humanizer-first). Hero embeds
  `components/humanizer-hero.tsx`, a live paste/upload → client-side `analyzeText` score card with a
  locked "rewrite" CTA that hands text to `/app/humanize` via `sessionStorage`. Shares
  `components/site-header.tsx` with `/pricing`.
- `app/pricing/page.tsx` — full plan comparison (`components/pricing/pricing-comparison.tsx`):
  monthly/annual toggle, plan cards, a feature-by-feature table (some rows badged "Coming soon" —
  see `docs/subscriptions.md`), and a non-plan-specific roadmap teaser.
- `app/login/page.tsx`, `app/signup/page.tsx`, `app/auth/callback/route.ts` — Supabase email/password
  auth (`components/auth/`), gated off `/app` by `proxy.ts`.
- `app/app/**` — product shell behind login, under `app/app/layout.tsx`, nav = Humanize / Billing:
  - `app/app/page.tsx` — redirects straight to `/app/humanize`; there's no separate dashboard.
  - `app/app/humanize/page.tsx` — **the whole product**: paste/upload → `/api/humanize` → before/after
    gauges, per-metric deltas, and the pass log.
  - `app/app/billing/page.tsx` — current plan/usage, `components/billing/plan-picker.tsx` (Stripe
    Checkout per plan) and `manage-subscription-button.tsx` (Stripe Billing Portal).

**Prompts live in `lib/prompts.ts`**, not inline. `buildHumanizeSystem()` (no arguments — always a
plain, natural human register, there's no voice fingerprint anymore) and `buildHumanizeUser(text,
result, pass)`, which feeds the detector's actual flags and weakest metrics back into each pass.
Both share the `ANTI_TELL_RULES` block (banned words, no em dashes, no "not just X, it's Y") — this
is the **single source of truth for AI tells** and must stay in sync with `LEXICON` in
`lib/detector.ts`: edit one, check the other, so humanized text actually scores well against the
detector grading it.

**Tests:** `lib/detector.test.ts` (6), `lib/humanize.test.ts` (7, pipeline logic), `lib/openai.test.ts`
(1, an SDK contract test against a mock server — pins the OpenAI **v6** request/response shape so an
SDK upgrade can't break the engine silently), `lib/usage.test.ts` (plan limits, period rollover,
`isDevBypass`).

## Current state & how to proceed (handoff)

**Done and verified:** landing page, client-side detection, the full multi-pass humanize engine
(confirmed live against `gpt-5.5`: e.g. 50→80→100 over two passes), dual themes, Supabase auth +
per-plan word quotas, Stripe subscriptions (Checkout/webhook/portal, monthly + annual), the `/pricing`
comparison page.

**Known debt / gaps (in priority order — see `docs/BUILD_PLAN.md` for the full milestone writeup):**
1. **Detection is a heuristic proxy, not a real detector** — this is now the top priority (M4).
   Integrate a real detector API (GPTZero/Originality/Copyleaks) and/or strengthen the heuristic so
   its flag rate credibly correlates with theirs. Everything else (real "pass reports", "guaranteed
   pass" marketing claims already teased on `/pricing`) is downstream of this.
2. **`pnpm lint` is red — 2 errors, one shared cause.** React 19's `set-state-in-effect` rule fires
   in `theme-toggle.tsx` and `app/app/humanize/page.tsx`. Fix with a shared
   `useLocalStorage`/`useSyncExternalStore`-style pattern.
3. **`components/live-demo.tsx` is dead code** (superseded by `humanizer-hero.tsx`); safe to delete.
4. **Upload only handles `.txt`/`.md`** (client-side `file.text()`); add `.docx`/`.pdf`.
5. **Growth hooks** (referral codes, SEO landing pages) — how this category actually grows.

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
