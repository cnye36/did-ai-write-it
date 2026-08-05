import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAuthNext } from "@/lib/auth-next";
import { MARKETING_EMAILS_COOKIE } from "@/lib/marketing-emails";

function clearMarketingCookie(res: NextResponse) {
  res.cookies.set(MARKETING_EMAILS_COOKIE, "", {
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = safeAuthNext(req.nextUrl.searchParams.get("next"));
  const oauthError = req.nextUrl.searchParams.get("error");
  const marketingIntent = req.cookies.get(MARKETING_EMAILS_COOKIE)?.value;

  if (oauthError) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "auth_failed");
    const res = NextResponse.redirect(url);
    clearMarketingCookie(res);
    return res;
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const url = new URL("/login", req.url);
      url.searchParams.set("error", "auth_failed");
      const res = NextResponse.redirect(url);
      clearMarketingCookie(res);
      return res;
    }

    // Signup-with-Google stashes opt-in in a short-lived cookie. Login omits it,
    // so we only ever turn marketing emails ON here, never off for returning users.
    if (marketingIntent === "1") {
      const { error: rpcError } = await supabase.rpc("set_marketing_emails", {
        p_enabled: true,
      });
      if (rpcError) {
        console.error("Failed to apply marketing email opt-in after OAuth:", rpcError.message);
      }
    }
  }

  const res = NextResponse.redirect(new URL(next, req.url));
  clearMarketingCookie(res);
  return res;
}
