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
content-integrity tool: paste or upload any text and get a real, Winston-verified read on it across
three checks, AI detection, plagiarism, and fact-checking, either standalone or bundled from the
detector as opt-in add-ons. The humanizer (rewrite until it reads human) is **paused, not deleted**
as of 2026-07-27: unlinked from nav and `/pricing`, its route (`app/app/humanize/page.tsx`) redirects
to `/app/detect`, but the engine (`lib/humanize.ts`, `/api/humanize`) is untouched and easy to bring
back, since this was a product-positioning call ("just a detector, for now"), not a technical one.

**2026-07-27: plagiarism + fact-checker wired in, pricing rebuilt around the detector, report
history shipped.** Three changes landed together:
- **Winston's plagiarism and fact-checker APIs** (`lib/winston.ts`'s `scoreWithPlagiarism` /
  `checkFacts`) are now live alongside AI detection: standalone tools at `/app/plagiarism` and
  `/app/fact-check`, plus opt-in add-on cards inside the detector's report
  (`components/detector-addons.tsx`) that run on the same text without leaving the page. Both cost
  Winston 2 credits/word (AI detection is 1), so they draw from the shared monthly quota at
  `PLAGIARISM_WORD_MULTIPLIER`/`FACT_CHECK_WORD_MULTIPLIER` (`lib/usage.ts`, both currently `2`)
  rather than 1:1. The Winston brand name is deliberately scoped to a small attribution badge inside
  each report card, nowhere in marketing copy, headlines, or button text.
- **Pricing was rebuilt detector-first.** No more per-request word cap (`PLAN_MAX_OUTPUT_WORDS` and
  `MaxOutputWordsExceededError` are gone); `/api/detect` and `/api/plagiarism` instead bound a
  single request by a flat character ceiling matching Winston's own documented limits per endpoint
  (150k detect, 120k plagiarism, 10k fact-check, `/api/humanize` unchanged at 12k chars since that
  one is genuinely output-token-bound). Monthly quotas (`PLAN_LIMITS`) went up across the board to
  match: **Free** 2,000, **Lite** 40,000, **Pro** 150,000, **Studio** 500,000 words/month, same
  price points. See `docs/subscriptions.md` for the full before/after.
- **Every successful check is now saved** to a `runs` table (`supabase/migrations/0004_runs.sql`,
  RLS-scoped to the owner) via `lib/runs.ts`'s `insertRun()`, called from `/api/detect`,
  `/api/plagiarism`, and `/api/fact-check` right after a billable result comes back, never on a
  null/unavailable one. `RunsSidebar` (`components/runs-sidebar.tsx`, wired into `app/app/layout.tsx`)
  lists recent runs and reopens one via `?run=<id>` (`lib/load-run.ts`'s `loadOwnedRun`, kind-checked
  so a plagiarism run can't be opened from the fact-check page); `/api/runs` lists/deletes,
  `/api/runs/[id]` fetches one.

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
  `claude-sonnet-5`) to run the humanize engine on Claude instead, `WINSTON_API_KEY` (powers AI
  detection, plagiarism, and fact-checking everywhere, plus the optional real-detector check on
  humanize output, see `lib/winston.ts`), `DEV_BYPASS_EMAIL` (one account exempt from all word
  quotas).
- Browser-pane **screenshots time out in this environment**; verify via page text / JS eval / network
  inspection instead.

## Architecture

**Supabase auth + Postgres for accounts/billing.** `/app/**` is gated by `proxy.ts`
(`lib/supabase/proxy.ts`) and every API route independently calls `requireUser()`
(`lib/supabase/auth.ts`) — defense in depth, since the proxy alone wouldn't stop a direct API call.
`profiles` (plan, Stripe IDs), `usage` (monthly word counter, rolled over by comparing
`period_start` to the current month, not a cron job), and `runs` (saved report history, see the
2026-07-27 note above) live in Postgres (`supabase/migrations/`). Text handed from the landing page
to the detector or humanizer rides in `sessionStorage` under `HANDOFF_KEY` (`lib/handoff.ts`).
Quota enforcement is a single shared `assertWithinQuota()` in `lib/usage.ts` checking monthly
`PLAN_LIMITS`, used by `/api/humanize`, `/api/detect`, `/api/plagiarism`, and `/api/fact-check`
since they all draw from the same monthly word pool, not separate quotas; there is no per-request
word cap, only each route's own flat `MAX_CHARS` (see the 2026-07-27 note above). `preview_checks`
(ip, created_at) is a separate, unauthenticated rate-limit table for the anonymous homepage scan,
unrelated to per-user quota, written only via the service-role client since there's no user session
to scope it to.

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
Multi-provider **AI-detection** aggregation specifically (GPTZero, Turnitin, alongside Winston) is
still on that same roadmap, not built, distinct from plagiarism/fact-check below which are Winston
products already wired in, not aggregation.

**`lib/winston.ts`** is the client for all three Winston APIs, each with its own min/max character
bounds and score polarity, so never assume one endpoint's shape or scale applies to another:
- `scoreWithWinston` (AI detection) — 0-100, **higher = more human**, 300-150,000 chars, 1 credit/word.
- `scoreWithPlagiarism` — 0-100, **higher = MORE plagiarism found** (opposite polarity, confirmed
  against Winston's own help docs), 100-120,000 chars, 2 credits/word. Returns matched `sources`
  (url, title, per-source match score) and a flattened `matches` array of character offsets into the
  original text for inline highlighting (`components/plagiarism-highlighted-text.tsx`).
- `checkFacts` — 0-100, **higher = better-supported** (same polarity as AI detection), 300-10,000
  chars (much shorter cap; the endpoint extracts at most 12 claims regardless of length), 2
  credits/word. Each claim carries an explicit `verdict` string (`SUPPORTED` /
  `PARTIALLY_SUPPORTED` / `NOT_ENOUGH_EVIDENCE` / `REFUTED`) plus an explanation and source links,
  used directly for claim-card coloring (`components/fact-check-claims.tsx`) rather than inferring
  color from the score. Claims carry sentence text but no character offsets, so
  `components/fact-check-highlighted-text.tsx` locates each one in the original text the same way
  `components/winston-highlighted-text.tsx` does for AI-detection sentences: sequential
  `indexOf`, skipping silently on no match rather than erroring. All three functions share the same
  "never a hard dependency" contract: unconfigured key, under-length text, or a failed request all
  return `null`, never throw.

**Score gauges** (`components/gauge.tsx`) take an explicit `color`/`label` rather than a fixed
verdict enum, since plagiarism's inverted polarity and fact-check's own thresholds don't fit
AI-detection's human/mixed/ai vocabulary. `components/score-gauge.tsx` (AI detection only) is now a
thin wrapper around `Gauge`; `lib/score-verdicts.ts` holds `plagiarismVerdict`/`factCheckVerdict`,
the color/label thresholds for the other two, shared between their standalone pages and the
detector's add-on cards so the three don't drift.

**API routes (`app/api/*/route.ts`)** are thin. All errors funnel through `errorResponse()` in
`lib/api-errors.ts`: 503 for a missing key (`MissingKeyError`), 500 otherwise.
- `/api/humanize` — OpenAI (`lib/openai.ts`: `getOpenAI()`, `OPENAI_MODEL`). Requires auth. Body
  `{ text, targetScore?, maxPasses? }` → `{ text, before, after, passes, model, usage }`. Quota
  checks skipped for the `DEV_BYPASS_EMAIL` account; a passing request calls the `increment_usage`
  Postgres RPC.
- `/api/detect`, `/api/plagiarism`, `/api/fact-check` — the three standalone, quota-metered checks,
  identically shaped: requires auth, bounded by that endpoint's own flat `MAX_CHARS`, quota checked
  via `assertWithinQuota` before calling Winston (plagiarism/fact-check charge `wordCount *
  PLAGIARISM_WORD_MULTIPLIER`/`FACT_CHECK_WORD_MULTIPLIER`, both `2`, reflecting Winston's real
  2-credit/word cost there), `increment_usage` and `insertRun` (saves to `runs`, see below) both
  fire only when Winston actually returns a result, never on a `null`/unconfigured/failed one, since
  nothing billable happened. Bodies: `{ text }` → `{ winston | plagiarism | factCheck, runId, usage }`.
- `/api/runs` — `GET` lists the signed-in user's recent runs (id/kind/title/word_count/score/created_at
  only, not the full text/result, for the sidebar); `DELETE ?id=` removes one, owner-scoped by RLS
  and an explicit `.eq("user_id", userId)`.
- `/api/runs/[id]` — `GET` fetches one full run (including `input_text` and `result`), owner-scoped
  the same way, used by each tool page's server component (`app/app/detect/page.tsx` etc.) to hydrate
  `?run=<id>` into its client component on load.
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
- `app/page.tsx` + `app/layout.tsx` — public landing (detector-first, no humanizer mention). Hero
  embeds `components/detector-hero.tsx`: paste/upload, an "Analyze" click hits `/api/preview-detect`
  (free, no account, real Winston score capped at 300 words and rate-limited per IP), the result
  renders in a modal with a partial reveal (`components/winston-sentence-list.tsx`) behind a
  "sign up free to see the full report" CTA, plus a locked row offering unlimited checks that hands
  text to `/app/detect` via `sessionStorage`. Shares `components/site-header.tsx` with `/pricing`.
- `app/pricing/page.tsx` — full plan comparison (`components/pricing/pricing-comparison.tsx`):
  monthly/annual toggle, plan cards, a feature-by-feature table across AI detection, plagiarism/fact
  checking, usage, and platform groups (some rows still badged "Coming soon", e.g. multi-provider
  AI-detection aggregation and API access — see `docs/subscriptions.md`), and a non-plan-specific
  roadmap teaser that includes the humanizer ("returning soon").
- `app/login/page.tsx`, `app/signup/page.tsx`, `app/auth/callback/route.ts` — Supabase email/password
  auth (`components/auth/`), gated off `/app` by `proxy.ts`.
- `app/app/**` — product shell behind login, under `app/app/layout.tsx`. Nav (`components/app-nav.tsx`,
  active-link aware via `usePathname`) = Detector / Plagiarism / Fact Check; Humanizer intentionally
  absent. A `RunsSidebar` (`components/runs-sidebar.tsx`) runs alongside `{children}` in the layout,
  fed saved reports fetched server-side in `app/app/layout.tsx` itself.
  - `app/app/page.tsx` — redirects straight to `/app/detect`; there's no separate dashboard.
  - `app/app/detect/page.tsx`, `app/app/plagiarism/page.tsx`, `app/app/fact-check/page.tsx` — each a
    thin server component that reads a `?run=<id>` search param, loads it via `loadOwnedRun` if
    present, and hands it as `initialRun` to a client component doing the actual UI
    (`components/detect-page.tsx`, `components/plagiarism-page.tsx`, `components/fact-check-page.tsx`
    respectively) — the server/client split exists purely to make `?run=` shareable/refreshable
    without a client-side fetch waterfall. Each client component: paste text, run the check, then a
    split-screen report (original text left, inline-highlighted text right, a score `Gauge` up top
    that stays out of the way of both panes) with a "Full report" deep link back to the sidebar's
    entry. `DetectPageClient` additionally shows the free heuristic quick-estimate before a check
    runs, and once verified, an "Add-on checks" row (`components/detector-addons.tsx`) offering the
    plagiarism and fact checks inline on the same text without navigating away.
  - `app/app/humanize/page.tsx` — paused (see the 2026-07-27 note above): a one-line redirect to
    `/app/detect`, not the old paste/upload UI. `/api/humanize` and its page UI are otherwise intact
    for whenever this comes back.
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
against `gpt-5.5`: e.g. 50→80→100 over two passes, currently paused/unlinked, not deleted), dual
themes, Supabase auth + per-plan word quotas, Stripe subscriptions (Checkout/webhook/portal, monthly
+ annual), the detector-first `/pricing` comparison page, Winston-backed plagiarism and fact-checking
(standalone tools plus detector add-ons), and per-user report history (`runs` table + sidebar).

**Known debt / gaps (in priority order — see `docs/BUILD_PLAN.md` for the full milestone writeup):**
1. **AI detection itself is still only single-provider (Winston).** Plagiarism and fact-checking are
   real, live Winston products now, not proxies, but multi-provider *AI-detection* aggregation
   (GPTZero, Turnitin, alongside Winston) is still on the roadmap, not built, and the free heuristic
   (`lib/detector.ts`) remains a proxy, not a real detector, for the cases where Winston is
   unconfigured or unavailable.
2. **`pnpm lint` is down to 2 errors**, both pre-existing and unrelated to the 2026-07-27 work:
   React 19's `set-state-in-effect` rule still fires in `theme-toggle.tsx` and
   `components/auth/user-nav.tsx` (both a bare `useEffect(() => setMounted(true), [])` mount-detection
   pattern). The detect/plagiarism/fact-check pages no longer trip this rule now that they're on
   `useHandoffInput`/plain `useState` instead of a raw effect. Fix the remaining two the same way:
   a shared `useLocalStorage`/`useSyncExternalStore`-style pattern. There's also a small unused-import
   warning in `app/page.tsx` (`PLAN_INFO`/`PLAN_ORDER`/`formatPlanPrice`) left over from a landing-page
   edit, harmless but worth a quick cleanup next time that file is touched.
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
- Reuse existing primitives — `Gauge` (generic score ring; `ScoreGauge` wraps it for AI-detection's
  human/mixed/ai vocabulary specifically), `DetectionReport`, `Reveal`, `ThemeToggle` — before
  building new ones. Match the tone and density of the existing pages.
- **Winston stays out of marketing copy and headlines.** It's the real-detector brand behind every
  score, but it only appears as a small attribution badge inside an actual report card (see the
  score panels on `/app/detect`, `/app/plagiarism`, `/app/fact-check`), never in page titles,
  button labels, or `/pricing` copy. Say "a real third-party detector" / "verified" instead.

## Working in this repo

Next.js is on a version ahead of most training data with breaking API changes. Before writing or
editing any Next.js-specific code (routing, config, data fetching, server actions, etc.), read the
relevant page under `node_modules/next/dist/docs/` first — do not assume older Next.js conventions
apply.
