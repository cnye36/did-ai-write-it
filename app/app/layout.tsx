import { Suspense } from "react";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { createClient } from "@/lib/supabase/server";
import type { RunListItem } from "@/lib/runs";
import { PLAN_LIMITS, wordsUsedInCurrentPeriod, type Plan } from "@/lib/usage";

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
  const wordsUsed = wordsUsedInCurrentPeriod(usage?.period_start, usage?.words_used);

  return (
    <div className="flex min-h-[100dvh] flex-col md:flex-row">
      <Suspense fallback={<aside className="hidden w-72 shrink-0 border-r border-line md:block" />}>
        <AppSidebar
          runs={(runs ?? []) as RunListItem[]}
          email={email}
          plan={plan}
          wordsUsed={wordsUsed}
          wordLimit={PLAN_LIMITS[plan]}
        />
      </Suspense>
      <main className="min-w-0 flex-1 px-4 py-8 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
