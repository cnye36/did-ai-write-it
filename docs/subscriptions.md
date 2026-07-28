# Subscription pricing strategy

Research pass on direct competitors before locking Stripe prices for M2. Every competitor checked
caps **words per single output**, in addition to a monthly quota, which Didaiwriteit.com does not
do today. Sources fetched 2026-07-21.

## Competitor pricing

| Tool | Plan | Price/mo | Words/mo | Max words/output | Notes |
|---|---|---|---|---|---|
| [WriteHuman](https://writehuman.ai/) | Basic | $12 | 80 requests x 600w cap (~48k ceiling) | 600 | priced by request count, not raw words |
| | Pro | $18 | 200 requests x 1,200w cap | 1,200 | "most popular" |
| | Ultra | $36 | unlimited requests | 3,000 | MCP access capped 1,000/mo |
| [GPTHuman](https://gpthuman.ai/pricing/) | Free | $0 | 300 (trial) | 300 | |
| | Starter | $15 | 25,000 | 750 | |
| | Plus | $25 | 60,000 | 1,200 | |
| | Unlimited | $49 | unlimited | 2,000 | "most popular" |
| [Undetectable.ai](https://undetectable.ai/pricing) | 10K | $9.99 | 10,000 | not stated | $0.999/1k words |
| | 20K | $19.00 | 20,000 | not stated | $0.95/1k words |
| | 35K | $31.00 | 35,000 | not stated | $0.886/1k words |
| | 50K | $42.50 | 50,000 | not stated | $0.85/1k words |
| [StealthGPT](https://www.stealthgpt.ai/pricing) | Pro | ~$30 | 100 req/day x 1,500w cap | 1,500 | via search, not directly fetched (429) |
| [HumanizeAI.pro](https://www.humanizeai.pro/upgrade) | — | — | — | — | site returned 403 to fetch; secondhand search results cited $19.99-$79 tiers with 20k-150k words but are **unverified**, excluded from analysis below |

**Free-tier trial sizes:** GPTHuman 300 words, Undetectable.ai 250 words. Our current 500-word free
tier is already on the generous end for a trial — no change needed there.

**Where we're over-generous today:** our Pro ($19/50,000 words) undercuts Undetectable's $19/20,000
tier by 2.5x, and beats GPTHuman's $25/60,000 tier on price despite a $6 lower price point. Our
Studio ($39/200,000 words) is more than 4x Undetectable's top metered tier ($42.50/50,000) at a
lower price. Neither plan caps words-per-output, which every competitor treats as a standard lever
(it protects against one giant single-shot request draining a whole month's quota in one call, and
it's also a natural paywall for long-form use cases).

## Plans (superseded, see 2026-07-27 pivot below)

| Plan | Price/mo | Words/mo | Max words/output | Notes |
|---|---|---|---|---|
| **Free** | $0 | 500 | 300 | unchanged quota; adds an output cap matching GPTHuman's free tier |
| **Lite** (new) | $9 | 10,000 | 800 | slots below Pro; matches Undetectable's $9.99/10k entry tier |
| **Pro** | $19 | 30,000 | 1,500 | down from 50,000; still beats Undetectable's $19/20k, priority processing |
| **Studio** | $39 | 100,000 | 2,500 | down from 200,000; still well ahead of Undetectable's $42.50/50k, real detector pass reports, API access |

Per-1,000-word price at these levels: Lite $0.90, Pro $0.633, Studio $0.39 — still cheaper per
word than every metered competitor at every tier, so the value story holds even after tightening,
while cutting worst-case OpenAI cost exposure per account by roughly 40-50% on Pro/Studio.

## 2026-07-27 pivot: detector-only pricing, no per-request word cap

With the product now selling detection first and the humanizer paused (see `CLAUDE.md`), the
per-output word cap stopped making sense: it was originally added because every humanizer
competitor caps words-per-generation to protect against a single request draining a month's quota,
but a detection check doesn't generate anything, it just scores text against Winston, so that
rationale doesn't apply. `PLAN_MAX_OUTPUT_WORDS` and `MaxOutputWordsExceededError` were removed;
`/api/detect`'s only per-request bound is now a flat `MAX_CHARS = 150_000` in
`app/api/humanize/route.ts` unchanged at 12,000 chars, `app/api/detect/route.ts`), independent of
plan. Monthly word quotas (`PLAN_LIMITS` in `lib/usage.ts`) were raised across the board to match a
detector-first product where the free heuristic scan competitors don't gate nearly as hard on
per-run length as the humanizer competitors researched above: **Free** 2,000 words/mo, **Lite**
40,000, **Pro** 150,000, **Studio** 500,000. Prices unchanged. Numbers live in `lib/usage.ts`
(`PLAN_LIMITS`) and `lib/plans.ts` (display copy for `/pricing` and `/app/billing`) — edit both
together.

## Annual billing

Implemented: annual plans bill for 10 months (2 months free), computed in `lib/plans.ts`
(`ANNUAL_MONTHS_FREE`, `annualPrice`, `priceForInterval`) rather than stored as a separate hardcoded
number, so the discount stays consistent if monthly prices change. Each paid plan needs **two**
Stripe Price IDs (see `.env.local.example`); `lib/stripe.ts`'s `priceIdForPlan(plan, interval)` and
`planForPriceId` handle both. The interval is chosen client-side (`components/billing/
interval-toggle.tsx`, used on `/app/billing` and the public `/pricing` page) and passed to
`/api/stripe/checkout`; we don't store which interval a subscriber is on anywhere in Postgres, the
Stripe customer portal is the source of truth for that.

## Full pricing page

`/pricing` (`app/pricing/page.tsx` + `components/pricing/pricing-comparison.tsx`) is the detailed
comparison: plan cards plus a feature-by-feature table. It includes roadmap features not yet
built, badged "Coming soon" so the page stays honest about what's live today: multi-language
humanizing, a guaranteed pass on GPTZero/Originality/Turnitin, and real detector pass reports.
These map onto `docs/BUILD_PLAN.md`'s M4 (real detector) and M5 (humanizer hardening).

## Dev bypass

`DEV_BYPASS_EMAIL` (see `.env.local.example`) exempts one account from all quota/output-cap checks
in `/api/humanize` for unrestricted internal testing.
