import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppNav } from "@/components/app-nav";
import { UserNav } from "@/components/auth/user-nav";
import { RunsSidebar } from "@/components/runs-sidebar";
import { createClient } from "@/lib/supabase/server";
import type { RunListItem } from "@/lib/runs";
import { isCurrentPeriod, PLAN_LIMITS, type Plan } from "@/lib/usage";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;
  if (!email) redirect("/login");

  const userId = data!.claims.sub as string;
  const [{ data: profile }, { data: usage }, { data: runs }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", userId).single(),
    supabase.from("usage").select("words_used, period_start").eq("user_id", userId).single(),
    supabase
      .from("runs")
      .select("id, kind, title, word_count, score, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const plan = (profile?.plan as Plan | undefined) ?? "free";
  const wordsUsed = usage && isCurrentPeriod(usage.period_start) ? usage.words_used : 0;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1400px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              Didaiwriteit<span className="text-accent">.com</span>
            </Link>
            <AppNav />
          </div>
          <div className="flex items-center gap-4">
            <UserNav email={email} plan={plan} wordsUsed={wordsUsed} wordLimit={PLAN_LIMITS[plan]} />
          </div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1400px] flex-1 flex-col md:flex-row">
        <Suspense fallback={<aside className="hidden w-72 shrink-0 border-r border-line md:block" />}>
          <RunsSidebar runs={(runs ?? []) as RunListItem[]} />
        </Suspense>
        <main className="min-w-0 flex-1 px-4 py-8 sm:px-6">{children}</main>
      </div>
    </div>
  );
}
