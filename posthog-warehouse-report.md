# PostHog Data Warehouse — Source Setup Report

## Summary

No sources were created automatically in this run. Credential collection was declined, so all 5 detected sources fall back to browser-based setup (deep-link path). Open each URL below in the PostHog app to finish connecting.

## Sources — browser setup required

### 1. Supabase (as Postgres)

Supabase is connected as a Postgres source using the **Session pooler** (not the direct host).

**Before opening the link, gather these credentials:**
- **Host**: `aws-0-<region>.pooler.supabase.com` (Supabase → Project Settings → Database → Connection pooling, Session mode)
- **Port**: `6543`
- **User**: `postgres.<your-project-ref>` (the project-ref is the subdomain in your `NEXT_PUBLIC_SUPABASE_URL`)
- **Password**: your Supabase **database** password (Settings → Database) — not the anon/service_role JWT keys
- **Database**: `postgres`

[Open in PostHog](https://us.posthog.com/project/539324/data-warehouse/new-source?kind=Postgres&utm_source=wizard&utm_campaign=warehouse-source)

---

### 2. Stripe

**Before opening the link, create a restricted API key:**
1. Go to Stripe Dashboard → Developers → API keys → + Create restricted key
2. Grant **Read** on Core, Billing, Connect headers — plus **Write** on Webhooks (enables real-time webhook sync)
3. The key starts with `rk_live_...`

The existing `STRIPE_SECRET_KEY` (`sk_...`) in your env **cannot** be used here — it's a secret key, not a restricted key.

After creating the source, go to the **Webhook** tab and click **Create webhook** to enable real-time sync (strongly recommended over append-only or full-refresh).

[Open in PostHog](https://us.posthog.com/project/539324/data-warehouse/new-source?kind=Stripe&utm_source=wizard&utm_campaign=warehouse-source)

---

### 3. Resend

**Before opening the link:**
- The `RESEND_API_KEY` in your env may be a send-only restricted key. PostHog needs a **full-access** key to read Audiences, Broadcasts, Contacts, Domains, and Emails.
- Create a new key at resend.com/api-keys with **Full access** permissions (starts with `re_...`).

[Open in PostHog](https://us.posthog.com/project/539324/data-warehouse/new-source?kind=Resend&utm_source=wizard&utm_campaign=warehouse-source)

---

### 4. OpenAI

**Before opening the link:**
- PostHog needs an **Admin API key** to read organization-level usage and cost data.
- The `OPENAI_API_KEY` in your env is a project key — it **cannot** read org-level data.
- Create an Admin key (starts with `sk-admin...`) at platform.openai.com/settings/organization/admin-keys. Requires organization owner access.

[Open in PostHog](https://us.posthog.com/project/539324/data-warehouse/new-source?kind=OpenAI&utm_source=wizard&utm_campaign=warehouse-source)

---

### 5. Anthropic

**Before opening the link:**
- PostHog needs an **Admin API key** to read organization-level Claude usage and cost data.
- The `ANTHROPIC_API_KEY` in your env is a standard key — it **cannot** read org-level data.
- Create an Admin key (starts with `sk-ant-admin...`) at console.anthropic.com/settings/admin-keys. Requires organization admin access.

[Open in PostHog](https://us.posthog.com/project/539324/data-warehouse/new-source?kind=Anthropic&utm_source=wizard&utm_campaign=warehouse-source)

---

## Files modified or created

- `posthog-warehouse-report.md` — this file (created)

No application source files were modified. This skill only connects external data sources to PostHog; it does not edit project code.

## Next steps

1. Open each link above and enter the credentials described.
2. For Stripe: after creating the source, open the **Webhook** tab and click **Create webhook** for real-time sync.
3. For Supabase: PostHog will scan your database schema and let you pick which tables to sync. Sync the `profiles`, `usage`, and `runs` tables for the most useful analytics joins.
4. Once sources are synced, you can JOIN warehouse tables against PostHog events in HogQL — e.g. join `stripe_subscription` on user ID to segment by plan in any insight.
