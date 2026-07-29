import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PREFIX = "/app";
const AUTH_PATHS = ["/login", "/signup"];
const APP_HOME = "/app/detect";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data } = await supabase.auth.getClaims();
  const isAuthed = Boolean(data?.claims);

  if (!isAuthed && request.nextUrl.pathname.startsWith(PROTECTED_PREFIX)) {
    const next = request.nextUrl.pathname + request.nextUrl.search;
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", next);
    return NextResponse.redirect(url);
  }

  if (isAuthed && AUTH_PATHS.includes(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = APP_HOME;
    url.search = "";
    return NextResponse.redirect(url);
  }

  // Avoid rendering the redirect-only AppIndex page — in Next.js 16 + Turbopack
  // dev, that triggers a React Performance.measure crash ("negative time stamp").
  if (isAuthed && request.nextUrl.pathname === "/app") {
    const url = request.nextUrl.clone();
    url.pathname = APP_HOME;
    return NextResponse.redirect(url);
  }

  return response;
}
