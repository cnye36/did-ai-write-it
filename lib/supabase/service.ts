import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client that bypasses RLS. Server-only. Used wherever we need to
 * write `profiles.plan` / Stripe IDs (webhook + billing-page sync), since the
 * normal user policy is select-own only.
 */
export function createServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  );
}
