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

**didaiwriteit.com** (renamed from letaiwriteit.com, pivot dated 2026-07-25) is a **detector-first**
AI writing tool: paste or upload any text, get a real Winston-verified AI-detection score, then
optionally humanize it until it reads human. The detector is now the primary product; the humanizer
is a secondary feature reachable from its own section once signed in, not the headline pitch.

**The free heuristic (`lib/detector.ts`) is not the customer-facing score anywhere it matters
(as of 2026-07-26).** It scores most AI text as too human to be credible as *the* score for a
product literally named "did AI write it," so Winston AI now powers every score a user is actually
shown: the public homepage scan (`/api/preview-detect`, rate-limited) and the signed-in detector
(`/api/detect`). The heuristic survives only as free, instant, zero-network supplementary signal
(the homepage's live word count, `/app/detect`'s "quick estimate" as-you-type readout) and as the
per-pass scoring signal feeding the humanize pipeline's prompts, never as a final verdict.

Positioning: *"Did AI write it? Find out."* Framing is deliberately **professional/marketing**
(LinkedIn posts, newsletters, marketing copy), **not** academic-cheating. The project pivoted from a
voice-first writer to a humanizer-first tool (to compete with undetectable.ai / writehuman.ai /
gpthuman.ai), then again (2026-07-22) removed the voice/on-brand-drafting feature entirely to focus
on detect + humanize, and then again (2026-07-25) to the current detector-first framing once the
didaiwriteit.com domain was acquired: the exact-match domain is a real SEO angle for "did ai write
it"-style search intent, and none of the competitors above lead with detection the way this one now
does. Multi-provider aggregation (GPTZero, Turnitin, alongside Winston) is on the roadmap but not
built; only Winston is wired in today. A from-scratch "guaranteed pass" voice feature is a possible
v2, not scoped (see `docs/BUILD_PLAN.md`).

**Stack:** Next.js 16 (App Router, Turbopack), TypeScript, Tailwind v4, pnpm, WSL2. Dual light/dark
themes, cobalt accent (`#2b47e0`, chosen to stand apart from the competitors' purple). **OpenAI**
powers the humanize engine by default; Anthropic is wired in as a second provider (`lib/rewrite.ts`),
switchable via `HUMANIZE_PROVIDER=anthropic` for A/B testing which model clears real detectors
better, since the two are genuinely different APIs (sampling knobs, multi-candidate mechanism), not
just a base URL swap.

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
  change), `HUMANIZE_PROVIDER=anthropic` + `ANTHROPIC_API_KEY` (+ optional `ANTHROPIC_MODEL`, default
  `claude-sonnet-5`) to run the humanize engine on Claude instead, `WINSTON_API_KEY` (optional
  real-detector check on humanize output, see `lib/winston.ts`), `DEV_BYPASS_EMAIL` (one account
  exempt from all word quotas).
- Browser-pane **screenshots time out in this environment**; verify via page text / JS eval / network
  inspection instead.

## Architecture

**Supabase auth + Postgres for accounts/billing.** `/app/**` is gated by `proxy.ts`
(`lib/supabase/proxy.ts`) and every API route independently calls `requireUser()`
(`lib/supabase/auth.ts`) — defense in depth, since the proxy alone wouldn't stop a direct API call.
`profiles` (plan, Stripe IDs) and `usage` (monthly word counter, rolled over by comparing
`period_start` to the current month, not a cron job) live in Postgres (`supabase/migrations/`). Text
handed from the landing page to the detector or humanizer rides in `sessionStorage` under
`HANDOFF_KEY` (`lib/handoff.ts`). Quota enforcement (`PLAN_MAX_OUTPUT_WORDS` per-request cap, then
the monthly `PLAN_LIMITS` quota) is a single shared `assertWithinQuota()` in `lib/usage.ts`, used by
both `/api/humanize` and `/api/detect` since Winston-verified detector checks draw from the same
monthly word pool as humanize rewrites, not a separate quota. `preview_checks` (ip, created_at) is a
separate, unauthenticated rate-limit table for the anonymous homepage scan, unrelated to per-user
quota, written only via the service-role client since there's no user session to scope it to.

**The humanize engine — `lib/humanize.ts` (the core product).** `runHumanizePipeline(original,
rewrite, opts)` is **provider-agnostic** (takes a `rewrite` callback, so the loop is unit-testable
and the model is swappable via `lib/rewrite.ts`) and **detector-agnostic**: every candidate is always
scored with `analyzeText` (free, feeds the per-pass prompt), and when `opts.scoreExternally` is
supplied (Winston, wired in from `/api/humanize`) that score becomes the authority for accept/reject
and for the `targetScore` stop condition instead, since a good heuristic score does not reliably
predict a good real-detector score. `scoreExternally` returning null for a given text (unconfigured,
request failed) falls back to the heuristic for that comparison, so it's never a hard dependency.
Best-of-n candidate selection (`lib/rewrite.ts`'s `pickBest`) is Winston-aware the same way. Stops at
`targetScore` (default 85) or `maxPasses` (default 4), so clean text costs zero model calls; note the
bar gets harder to clear once Winston is driving it. Guards reject an empty response or a rewrite
that drifts outside 0.5x–2x the original word count. Returns `{ text, before, after, externalBefore,
externalAfter, passes }`.

**`lib/detector.ts`** — pure, synchronous, unit-tested heuristic scorer (`analyzeText`), no network,
safe on every keystroke. Scores 0–100 where **higher = more human**, on four weighted metrics
(lexicon 30%, burstiness 25%, rhythm 25%, punctuation 20%) against a `LEXICON` of stock AI phrases,
sentence-length variance, uniform-length runs, em dashes, and stacked rule-of-three lists. The raw
weighted score then gets an explicit `AI_LEAN_PENALTY` and raised verdict thresholds
(`HUMAN_THRESHOLD`/`AI_THRESHOLD`) — a deliberate product decision to score skeptically (see
`docs/BUILD_PLAN.md` M4a), not part of the accuracy model. Returns `score`, `verdict`, `metrics`,
`flags` (whole-document, with character offsets), and `sentences` (every sentence individually
scored/verdicted with its own `reasons`, reusing the same flags via range overlap — powers the
line-by-line report). This is a **heuristic proxy**, not a real detector like GPTZero. Real
perplexity scoring was investigated and ruled out for now (gpt-5.5 can't score arbitrary input text,
only its own generated tokens); a real third-party detector API is the planned M4b, not yet funded.

**API routes (`app/api/*/route.ts`)** are thin. All errors funnel through `errorResponse()` in
`lib/api-errors.ts`: 503 for a missing key (`MissingKeyError`), 500 otherwise.
- `/api/humanize` — OpenAI (`lib/openai.ts`: `getOpenAI()`, `OPENAI_MODEL`). Requires auth. Body
  `{ text, targetScore?, maxPasses? }` → `{ text, before, after, passes, model, usage }`. Quota
  checks skipped for the `DEV_BYPASS_EMAIL` account; a passing request calls the `increment_usage`
  Postgres RPC.
- `/api/detect` — standalone real-detector check for signed-in users, unlimited length (up to
  `MAX_CHARS`). Requires auth. Body `{ text }` → `{ winston: { score, sentences } | null, usage }`.
  Quota (`assertWithinQuota`) is checked before calling Winston, but `increment_usage` only fires
  when Winston actually returns a score: if it's unconfigured, the text is under
  `WINSTON_MIN_CHARS`, or the request fails, the response still carries `winston: null` but consumes
  no quota, since nothing billable happened.
- `/api/preview-detect` — the anonymous homepage scan (2026-07-26). No auth. Body `{ text }` →
  `{ winston: { score, sentences } | null }`. Server-truncates to the first 300 words regardless of
  what the client sends (`MAX_WORDS`), then via `createServiceClient()` checks a per-IP daily
  counter against `public.preview_checks` (`DAILY_LIMIT`, currently 5/24h; IP read from
  `x-forwarded-for`, not `request.ip`, which isn't reliable on current Next.js) and returns 429 once
  exhausted. Only inserts a `preview_checks` row, i.e. only spends a rate-limit slot, when Winston
  actually returns a score, same "don't debit on a no-op" principle as `/api/detect`.
- `/api/stripe/checkout`, `/api/stripe/portal` — requires auth; create a Stripe Checkout/Billing
  Portal session (`lib/stripe.ts`) and return `{ url }` for the client to redirect to.
- `/api/stripe/webhook` — no auth (Stripe calls it directly); verifies the signature and syncs
  `profiles.plan`/`stripe_customer_id`/`stripe_subscription_id` via the service-role client
  (`lib/supabase/service.ts`). `/api/preview-detect` also uses the service-role client (no user
  session to scope RLS to for an anonymous rate-limit table), so it's no longer the only route that
  bypasses RLS.

**Pages under `app/`:**
- `app/page.tsx` + `app/layout.tsx` — public landing (detector-first). Hero embeds
  `components/detector-hero.tsx`: paste/upload, an "Analyze" click hits `/api/preview-detect` (free,
  no account, real Winston score capped at 300 words and rate-limited per IP), the result renders in
  a modal with a partial reveal (`components/winston-sentence-list.tsx`) behind a "sign up free to
  see the full report" CTA, plus a locked row offering unlimited checks that hands text to
  `/app/detect` via `sessionStorage`, and a smaller secondary link to `/app/humanize`. Shares
  `components/site-header.tsx` with `/pricing`.
- `app/pricing/page.tsx` — full plan comparison (`components/pricing/pricing-comparison.tsx`):
  monthly/annual toggle, plan cards, a feature-by-feature table (some rows badged "Coming soon" —
  see `docs/subscriptions.md`), and a non-plan-specific roadmap teaser.
- `app/login/page.tsx`, `app/signup/page.tsx`, `app/auth/callback/route.ts` — Supabase email/password
  auth (`components/auth/`), gated off `/app` by `proxy.ts`.
- `app/app/**` — product shell behind login, under `app/app/layout.tsx`, nav = Detector / Humanizer /
  Billing:
  - `app/app/page.tsx` — redirects straight to `/app/detect`; there's no separate dashboard.
  - `app/app/detect/page.tsx` — live free heuristic score-as-you-type (`analyzeText`,
    `DetectionReport`, labeled "quick estimate") plus a "Check with Winston" button hitting
    `/api/detect` for a real, quota-metered score and per-sentence breakdown
    (`components/winston-sentence-list.tsx`).
  - `app/app/humanize/page.tsx` — paste/upload → `/api/humanize` → before/after gauges, per-metric
    deltas, and the pass log.
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

**Done and verified:** landing page, client-side detection (now per-sentence, with a line-by-line
report — `components/detection-report.tsx`), the full multi-pass humanize engine (confirmed live
against `gpt-5.5`: e.g. 50→80→100 over two passes), dual themes, Supabase auth + per-plan word
quotas, Stripe subscriptions (Checkout/webhook/portal, monthly + annual), the `/pricing` comparison
page.

**Known debt / gaps (in priority order — see `docs/BUILD_PLAN.md` for the full milestone writeup):**
1. **Detection is a heuristic proxy, not a real detector (M4b, not yet funded)** — still the top
   priority. The free heuristic itself was hardened (M4a: per-sentence scoring, explicit AI-lean
   bias, line-by-line report), but a real detector API (GPTZero/Originality/Copyleaks) is what
   actually backs "real pass reports" and "guaranteed pass" claims already teased on `/pricing`.
   Every option researched has a real floor of ~$25-50/mo minimum for API access.
2. **`pnpm lint` is red — 4 errors, one shared cause.** React 19's `set-state-in-effect` rule fires
   in `theme-toggle.tsx`, `components/auth/user-nav.tsx`, `app/app/humanize/page.tsx`, and (as of the
   2026-07-25 detector-first pivot, which added a second page using the same sessionStorage-handoff
   pattern) `app/app/detect/page.tsx`. Fix with a shared `useLocalStorage`/`useSyncExternalStore`-style
   pattern.
3. **`components/live-demo.tsx` and `components/highlighted-text.tsx` are dead code** (the former
   superseded by `detector-hero.tsx`, the latter by `detection-report.tsx`'s per-sentence
   highlighting); safe to delete.
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
- Reuse existing primitives — `ScoreGauge`, `DetectionReport`, `Reveal`, `ThemeToggle` — before
  building new ones. Match the tone and density of the existing pages.

## Working in this repo

Next.js is on a version ahead of most training data with breaking API changes. Before writing or
editing any Next.js-specific code (routing, config, data fetching, server actions, etc.), read the
relevant page under `node_modules/next/dist/docs/` first — do not assume older Next.js conventions
apply.
