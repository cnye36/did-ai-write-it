import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAuthNext } from "@/lib/auth-next";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const next = safeAuthNext(req.nextUrl.searchParams.get("next"));
  const oauthError = req.nextUrl.searchParams.get("error");

  if (oauthError) {
    const url = new URL("/login", req.url);
    url.searchParams.set("error", "auth_failed");
    return NextResponse.redirect(url);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const url = new URL("/login", req.url);
      url.searchParams.set("error", "auth_failed");
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.redirect(new URL(next, req.url));
}
