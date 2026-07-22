import { UnauthorizedError } from "@/lib/api-errors";
import { createClient } from "@/lib/supabase/server";

/** Server-only. Throws UnauthorizedError (-> 401 via errorResponse) if no session. */
export async function requireUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) {
    throw new UnauthorizedError();
  }
  const email = data?.claims?.email as string | undefined;
  return { supabase, userId, email };
}
