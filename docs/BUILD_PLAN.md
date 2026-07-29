# Build plan

Didaiwriteit.com (renamed from Letaiwriteit.com, pivot dated 2026-07-25) is a detector-first AI
writing tool: paste any text, get a real Winston-verified AI-detection score, then humanize it
through a multi-pass engine until it reads human. See `CLAUDE.md` for the full product/architecture
rundown. This doc tracks the milestone roadmap so the project stays legible as it's built in public.

**2026-07-25 pivot: detector-first, Didaiwriteit.com.** Acquired the exact-match domain
Didaiwriteit.com and repositioned the product around it: the AI detector (already strong from M4a)
is now the headline feature and the primary public-facing tool, with the humanizer kept as a
secondary "Humanizer" section alongside a new "Detector" section once signed in
(`app/app/detect/page.tsx`, `/api/detect`). Winston AI checks now run standalone, not just inside the
humanize pipeline, but only for signed-in users; the public landing widget stays on the free
client-side heuristic to avoid unbounded per-word Winston cost from anonymous traffic. Detector
checks draw from the same monthly word quota as humanize (`lib/usage.ts`'s `assertWithinQuota`), not
a separate pool. Multi-provider aggregation (GPTZero, Turnitin alongside Winston) stays on the
roadmap, not built.

**2026-07-26 follow-up: Winston on the public homepage too.** The heuristic (M4a) turned out to be
too generous, scoring most AI text as human, which undermines the product's whole premise on its own
front door. The public homepage scan (`components/detector-hero.tsx`) now hits Winston directly via
a new unauthenticated route, `/api/preview-detect`, instead of `analyzeText`: capped at 300 words per
scan (`MAX_WORDS`) and rate-limited to 5 free checks per IP per 24h (`DAILY_LIMIT`, tracked in the new
`public.preview_checks` table, `supabase/migrations/0003_preview_checks.sql`) so the reversal of the
2026-07-25 "stay on the heuristic to avoid unbounded Winston cost" decision has a real ceiling instead
of none. The heuristic is no longer the customer-facing score anywhere in the product; it survives
only as a free, zero-network, explicitly-labeled "quick estimate" (`/app/detect`'s as-you-type
readout) and as the humanize pipeline's internal per-pass scoring signal.

**Focus: detect + humanize, and only that.** Every competitor in this space (WriteHuman, GPTHuman,
Undetectable.ai, StealthGPT) is a pure paste-in-content-from-elsewhere → detect → rewrite tool; none
of them lead with a "write from scratch in your voice" feature. We had one (voice fingerprint +
on-brand drafting) and pulled it out (see M4's old scope, removed 2026-07-22) to go all-in on the
two components that actually win this category: a detector credible enough to flag what real
detectors flag, and a humanizer aggressive enough to clear them. A "guaranteed pass, write from
scratch" voice feature is still on the radar longer-term, but only once the core detect/humanize loop
is winning on its own.

Pricing tiers (see `docs/subscriptions.md` for the competitor research behind these numbers, and
`lib/plans.ts`/`lib/usage.ts` for the source of truth): **Free** ($0, 2000 words/mo),
**Lite** ($9/mo, 40,000 words/mo), **Pro** ($24/mo, 150,000 words/mo, priority processing), **Studio** ($49/mo, 500,000 words/mo, real
detector pass reports, API access).

## Milestones

- **M0 — Done.** Landing page, client-side AI-detection heuristic (`lib/detector.ts`), the multi-pass
  humanize engine (`lib/humanize.ts`), dual light/dark themes.
- **M1 — Auth + usage metering. Done.** Supabase email/password accounts, `/app/**` behind login
  (proxy-level redirect plus per-route `requireUser()` on every API endpoint), per-plan monthly word
  quotas enforced on `/api/humanize` via the `increment_usage` RPC, usage shown in the product nav.
- **M2 — Stripe subscriptions. Done.** Stripe Checkout for Lite/Pro/Studio (`/api/stripe/checkout`),
  monthly and annual (2 months free, `lib/plans.ts`), a webhook (`/api/stripe/webhook`) that syncs
  `profiles.plan`/`stripe_customer_id`/`stripe_subscription_id` on `checkout.session.completed`,
  `customer.subscription.updated`, and `customer.subscription.deleted`, and a customer-portal link
  (`/api/stripe/portal`) for self-serve upgrade/downgrade/cancel from `/app/billing`. A dedicated
  `/pricing` page has the full plan-comparison table plus a "coming soon" roadmap teaser (see
  `docs/subscriptions.md`). Word quota limits (`lib/usage.ts`) switch automatically with
  `profiles.plan`. A `DEV_BYPASS_EMAIL` env var exempts one account from all quota/output checks
  for internal testing.
- **M3 — Lint debt cleanup.** Four `set-state-in-effect` ESLint errors remain (`theme-toggle.tsx`,
  `components/auth/user-nav.tsx`, `app/app/humanize/page.tsx`, `app/app/detect/page.tsx`) — all
  read/write client-only state inside a `useEffect`. Fix with a shared
  `useLocalStorage`/`useSyncExternalStore`-style pattern.
- **M4 — Real detector integration (top product priority, split in two).**
  - **M4a — Free heuristic hardening. Done.** `analyzeText` (`lib/detector.ts`) now scores every
    sentence individually, not just the whole document (`DetectorResult.sentences`), and applies an
    explicit `AI_LEAN_PENALTY` plus raised verdict thresholds (`HUMAN_THRESHOLD`/`AI_THRESHOLD`) —
    a deliberate product decision to score skeptically, not an accuracy claim: a false "reads human"
    costs a user who thinks they're safe when they're not, which is worse than a false "reads ai."
    Backing regression test (`lib/detector.test.ts`): a realistic, unedited generic AI blog post must
    not verdict "human." `components/detection-report.tsx` renders the line-by-line breakdown (every
    flagged sentence highlighted with its reasons) for logged-in users on `/app/humanize` and
    `/app/detect`'s live "quick estimate," full report, as they type. The public landing widget no
    longer uses this heuristic report at all (see the 2026-07-26 follow-up above): it shows a
    partial-reveal Winston report instead (`components/winston-sentence-list.tsx`).
  - **Investigated and ruled out: perplexity via our own OpenAI calls.** True perplexity needs
    log-probabilities for text *you feed the model*, not text it generates. That only ever existed on
    OpenAI's legacy Completions API (`echo` + `logprobs`), tied to old base models mostly already shut
    down (fully sunsetting September 2026); `gpt-5.5` is Chat-Completions-only and its `logprobs` only
    cover the model's own generated tokens. Confirmed against OpenAI's deprecations docs, not assumed.
    A real path exists (an open-weight base model via a serverless provider that still exposes
    `echo`/`logprobs`, using the same `OPENAI_BASE_URL`-swap architecture noted below) but that's a
    new per-call cost and its own feasibility spike — not attempted this round.
  - **M4b — Integrate a real third-party detector API. Committed, not yet funded.** Researched
    GPTZero, Originality.ai, Copyleaks, Winston AI, and Sapling: every option has a real floor of
    roughly $25–50/month minimum just to unlock API access (see chat history / revisit and move into
    `docs/subscriptions.md` when scoping this), before per-word usage even matters at current volume.
    Do this as soon as there's budget for it. Unlocks the "real detector pass reports" Studio feature
    and the "guaranteed pass" claims already teased (as "Coming soon") on `/pricing` — those badges
    stay honest ("coming soon," not live) until this actually lands.
- **M5 — Humanizer engine hardening.** The other half of the bet: make `lib/humanize.ts` itself more
  aggressive and tunable (per-detector rewrite strategies, higher target scores, more passes when it's
  worth the cost) so a confident "clears every major detector" claim is backed by M4's real scoring,
  not just our own heuristic. Multi-language humanizing (already teased on `/pricing`) likely lands
  here too.
- **M6 — Growth.** `.docx`/`.pdf` upload support (today: `.txt`/`.md` only, client-side `file.text()`),
  referral codes, SEO landing pages.
- **Later, not scoped — "write in your voice" v2.** A from-scratch drafting feature that guarantees a
  detector pass up front, once M4/M5 make that guarantee credible. Deliberately not now: it's a
  different battle (content creation) than the one the market is actually fighting (detection
  evasion), and splitting focus there was diluting the pitch.

## Model/infra strategy

No owned inference server. Launch on OpenAI directly; scale onto serverless inference (Together/DeepInfra/
Groq) via `OPENAI_BASE_URL` with zero code change, per-token cost only. Later, distill logged
winning humanize-pipeline rewrites into a LoRA fine-tune of a 7B–14B open model — the pipeline's own
output is a free, continuously-growing (AI-text → human-passing-text) training set.
