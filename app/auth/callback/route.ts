import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeAuthNext } from "@/lib/auth-next";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(new URL(safeAuthNext(req.nextUrl.searchParams.get("next")), req.url));
}
