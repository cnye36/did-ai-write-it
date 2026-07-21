# Build plan

letaiwriteit.com is a humanizer-first AI writing tool: paste AI text, get a free instant AI-detection
score, then rewrite it through a multi-pass engine until it reads human. See `CLAUDE.md` for the full
product/architecture rundown. This doc tracks the milestone roadmap so the project stays legible as it's
built in public.

Pricing tiers are already committed on the landing page (`app/page.tsx`): **Free** ($0, 500 humanized
words/mo, drafts in browser), **Pro** ($19/mo, 50,000 words/mo, one saved voice profile), **Studio**
($39/mo, 200,000 words/mo, multiple synced voices, real detector pass reports, API access).

## Milestones

- **M0 — Done.** Landing page, client-side AI-detection heuristic (`lib/detector.ts`), the multi-pass
  humanize engine (`lib/humanize.ts`), the voice studio (analyze → draft → save), dual light/dark themes.
- **M1 — Auth + usage metering (in progress).** Supabase email/password accounts, `/app/**` behind login,
  per-plan monthly word quotas enforced on `/api/humanize`, usage shown in the product nav. Prerequisite
  for everything below.
- **M2 — Stripe subscriptions.** Stripe Checkout for Pro/Studio, a webhook that syncs `profiles.plan` on
  subscription create/update/cancel, a customer-portal link for self-serve upgrade/downgrade/cancel. Word
  quota limits (`lib/usage.ts`) switch automatically with `profiles.plan`.
- **M3 — Lint debt cleanup.** Four `set-state-in-effect` ESLint errors (`theme-toggle.tsx`,
  `app/app/onboarding/page.tsx`, `app/app/write/page.tsx`, `app/app/humanize/page.tsx`) all stem from
  reading `localStorage` via `setState` inside `useEffect`. Fix once with a shared
  `useLocalStorage`/`useSyncExternalStore` hook — reusable for the client-side auth session too.
- **M4 — Voice profile/draft DB migration.** Move `VoiceProfile`/`Draft` (currently `lib/voice.ts`'s
  `localStorage` layer) into Supabase tables, gated by plan: Free stays browser-only (per the pricing
  copy), Pro gets one synced profile, Studio gets multiple synced profiles.
- **M5 — Real detector integration.** `analyzeText` is a heuristic proxy, not a real detector. Integrate
  a real detector API (GPTZero/Originality) for Studio's "real detector pass reports."
- **M6 — Growth.** `.docx`/`.pdf` upload support (today: `.txt`/`.md` only, client-side `file.text()`),
  referral codes, SEO landing pages.

## Model/infra strategy

No owned inference server. Launch on OpenAI directly; scale onto serverless inference (Together/DeepInfra/
Groq) via `OPENAI_BASE_URL` with zero code change, per-token cost only. Later, distill logged
winning humanize-pipeline rewrites into a LoRA fine-tune of a 7B–14B open model — the pipeline's own
output is a free, continuously-growing (AI-text → human-passing-text) training set.
