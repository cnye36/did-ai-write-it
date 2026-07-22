import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client that bypasses RLS. Server-only, and only for the Stripe webhook, which
 * has no user session to write profiles.plan/stripe_* fields under the normal select-own policy.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}
