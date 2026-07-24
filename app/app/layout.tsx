import Link from "next/link";
import { redirect } from "next/navigation";
import { UserNav } from "@/components/auth/user-nav";
import { createClient } from "@/lib/supabase/server";
import { isCurrentPeriod, PLAN_LIMITS, type Plan } from "@/lib/usage";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const email = data?.claims?.email as string | undefined;
  if (!email) redirect("/login");

  const userId = data!.claims.sub as string;
  const [{ data: profile }, { data: usage }] = await Promise.all([
    supabase.from("profiles").select("plan").eq("id", userId).single(),
    supabase.from("usage").select("words_used, period_start").eq("user_id", userId).single(),
  ]);
  const plan = (profile?.plan as Plan | undefined) ?? "free";
  const wordsUsed = usage && isCurrentPeriod(usage.period_start) ? usage.words_used : 0;

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-40 border-b border-line bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-[1100px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-6">
            <Link href="/" className="text-sm font-semibold tracking-tight">
              letaiwriteit<span className="text-accent">.com</span>
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/app/humanize"
                className="text-sm text-muted transition-colors hover:text-ink"
              >
                Humanize
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <UserNav email={email} plan={plan} wordsUsed={wordsUsed} wordLimit={PLAN_LIMITS[plan]} />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
