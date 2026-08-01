# Did AI Write It

**Did AI write it? Find out.**

[didaiwriteit.com](https://didaiwriteit.com) is a detector-first AI writing tool. Paste or upload any text, get an instant free AI-detection score, then verify it against Winston AI (a real third-party detector) and humanize it through a multi-pass engine until it reads human. Meaning stays. The machine fingerprint does not.

Built for LinkedIn posts, newsletters, and marketing drafts, not academic cheating.

---

## How it works

1. **Paste or upload** — Drop in any text (`.txt` / `.md` today).
2. **See the score** — Instant client-side score plus a line-by-line report: stock lexicon, flat rhythm, burstiness, em dashes, rule-of-three piles.
3. **Verify or humanize** — Sign up free to confirm the score against Winston AI, then run it through the multi-pass humanizer until it reads clean (or it hits the pass cap). Clean input costs zero model calls.

Detection runs in the browser on every keystroke, free and unlimited, no account needed. Winston-verified checks and humanizing run server-side and require a free account.

---

## Stack

| Layer | Choice |
| --- | --- |
| App | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| UI | Tailwind CSS v4, Phosphor icons, `motion`, dual light/dark themes |
| Auth + DB | Supabase (email/password, Postgres, RLS) |
| Billing | Stripe Checkout + Customer Portal (monthly + annual) |
| Humanize | OpenAI Chat Completions (`gpt-5.5` by default) |
| Package manager | **pnpm** (do not use npm) |

---

## Quick start

**Requires Node 24+** (WSL default Node 18 will not work). Source nvm if needed:

```bash
source ~/.nvm/nvm.sh
node -v   # expect v24.x
```

```bash
pnpm install
cp .env.local.example .env.local
# fill in keys (see below)
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Next 16 refuses a second `pnpm dev` for the same directory. Stop the first one before starting another.

### Environment

Copy `.env.local.example` → `.env.local` and set:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Humanize engine |
| `OPENAI_MODEL` | Optional. Defaults to `gpt-5.5` |
| `OPENAI_BASE_URL` | Optional. Point at Together / DeepInfra / Groq with no code change |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Browser + server auth client |
| `SUPABASE_SECRET_KEY` | Stripe webhook only (bypasses RLS) |
| `STRIPE_SECRET_KEY` | Billing |
| `STRIPE_WEBHOOK_SECRET` | Webhook signature verification |
| `STRIPE_PRICE_{LITE,PLUS,PRO}_{MONTHLY,ANNUAL}` | Six Price IDs (one per plan × interval) |
| `DEV_BYPASS_EMAIL` | Optional. One account exempt from word quotas |

### Database

Run the SQL migrations in order against your Supabase project (SQL Editor):

1. `supabase/migrations/0001_auth_and_usage.sql` — profiles, usage, signup trigger, `increment_usage` RPC
2. `supabase/migrations/0002_lite_plan.sql` — adds the Lite plan to the plan check constraint

### Stripe (local)

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Paste the signing secret into `STRIPE_WEBHOOK_SECRET`. Create Lite / Plus / Pro products with monthly and annual prices (annual = 50% off, billed yearly), then wire the six Price IDs into `.env.local`.

---

## Commands

```bash
pnpm dev              # Turbopack dev server (port 3000)
pnpm build            # Production build
pnpm start            # Serve production build
pnpm lint             # ESLint
pnpm test             # Vitest (all)
pnpm vitest run lib/humanize.test.ts   # Single file
pnpm eval:humanize    # Run corpus through the live humanize pipeline
```

Prefix installs with `CI=true` when you need non-interactive pnpm confirms.

---

## Project map

```
app/
  page.tsx                 Landing (live free detect → handoff to /app/detect or /app/humanize)
  pricing/                 Plan comparison
  login|signup|auth/       Supabase email/password auth
  app/detect/              Live detect + Winston-verified real-detector check
  app/humanize/            Paste → detect → rewrite
  app/billing/             Plan, usage, Stripe Checkout / Portal
  api/detect/              Winston-verified check + quota enforcement
  api/humanize/            Multi-pass rewrite + quota enforcement
  api/stripe/              Checkout, portal, webhook
components/                UI (hero, score gauge, detection report, billing)
lib/
  detector.ts              Heuristic AI scorer (pure, sync, unit-tested)
  humanize.ts              Provider-agnostic multi-pass pipeline
  prompts.ts               System/user prompts + ANTI_TELL_RULES
  usage.ts / plans.ts      Quotas, output caps, plan display copy
  openai.ts / stripe.ts    Provider clients
  supabase/                Auth helpers, proxy gate, service-role client
docs/
  BUILD_PLAN.md            Milestone roadmap
  subscriptions.md         Pricing research + plan rationale
```

Auth is defense-in-depth: `proxy.ts` gates `/app/**`, and every API route also calls `requireUser()`.

---

## Plans

| Plan | Monthly | Annual (billed yearly) | Words / month | Max words / request |
| --- | --- | --- | --- | --- |
| Free | $0 | $0 | 2,000
| Lite | $9/mo | $5/mo | 40,000
| Plus | $24/mo | $12/mo | 150,000
| Pro | $49/mo | $24/mo | 500,000 

Annual is 50% off, shown as a discounted monthly rate (not a yearly lump sum). Numbers live in `lib/plans.ts`. Details and competitor context: [`docs/subscriptions.md`](docs/subscriptions.md).

---

## Architecture notes

**Detector** (`lib/detector.ts`) — Heuristic proxy, not GPTZero. Scores 0–100 (higher = more human) on lexicon, burstiness, rhythm, and punctuation. Deliberately skeptical (`AI_LEAN_PENALTY`, raised thresholds): a false "human" is worse for the user than a false "AI." Real third-party detector APIs are planned (M4b), not yet funded.

**Humanize pipeline** (`lib/humanize.ts`) — Takes a `rewrite` callback so the loop is unit-testable and the provider is swappable. Each pass rewrites, re-scores with `analyzeText`, and keeps the result only if the score improved. Stops at `targetScore` (default 85) or `maxPasses` (default 3). Rejects empty responses and rewrites that drift outside 0.5×–2× the original word count.

**Prompts** (`lib/prompts.ts`) — Single source of truth for banned AI tells. Keep `ANTI_TELL_RULES` in sync with `LEXICON` in the detector.

Deeper product context and agent working notes: [`CLAUDE.md`](CLAUDE.md). Roadmap: [`docs/BUILD_PLAN.md`](docs/BUILD_PLAN.md).

---

## Status

**Live:** landing detect widget, standalone Winston-verified detector check, multi-pass humanizer, per-sentence detection report, Supabase auth, per-plan quotas, Stripe subscriptions (Checkout / webhook / portal), `/pricing`.

**Next priorities:** real detector API integration, humanizer hardening, `.docx` / `.pdf` upload, growth hooks. See the build plan for the full milestone list.
