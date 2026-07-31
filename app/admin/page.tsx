import { redirect } from "next/navigation";
import { requireUser } from "@/lib/supabase/auth";
import { isAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { PLAN_LIMITS, wordsUsedInCurrentPeriod, type Plan } from "@/lib/usage";
import { PLAN_ORDER, PLAN_INFO } from "@/lib/plans";

interface ProfileRow {
  id: string;
  email: string;
  plan: Plan;
  stripe_subscription_id: string | null;
  created_at: string;
}

interface UsageRow {
  user_id: string;
  period_start: string;
  words_used: number;
}

export default async function AdminPage() {
  const { email } = await requireUser();
  if (!isAdmin(email)) redirect("/app/detect");

  const service = createServiceClient();
  const [{ data: profiles }, { data: usageRows }] = await Promise.all([
    service
      .from("profiles")
      .select("id, email, plan, stripe_subscription_id, created_at")
      .order("created_at", { ascending: false }),
    service.from("usage").select("user_id, period_start, words_used"),
  ]);

  const usageByUser = new Map((usageRows as UsageRow[] | null)?.map((u) => [u.user_id, u]));
  const users = ((profiles as ProfileRow[] | null) ?? []).map((profile) => {
    const usage = usageByUser.get(profile.id);
    const wordsUsed = wordsUsedInCurrentPeriod(usage?.period_start, usage?.words_used);
    return { ...profile, wordsUsed, limit: PLAN_LIMITS[profile.plan] };
  });

  const planCounts = PLAN_ORDER.map((plan) => ({
    plan,
    count: users.filter((u) => u.plan === plan).length,
  }));

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted">Users, plans, and monthly usage.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div className="rounded-2xl border border-line bg-raised p-4">
          <p className="text-xs text-faint">Total users</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{users.length}</p>
        </div>
        {planCounts.map(({ plan, count }) => (
          <div key={plan} className="rounded-2xl border border-line bg-raised p-4">
            <p className="text-xs text-faint">{PLAN_INFO[plan].name}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{count}</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-raised text-xs uppercase tracking-wide text-faint">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Usage</th>
              <th className="px-4 py-3 font-medium">Subscribed</th>
              <th className="px-4 py-3 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const pct = user.limit > 0 ? Math.min(100, (user.wordsUsed / user.limit) * 100) : 0;
              return (
                <tr key={user.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink">{user.email}</td>
                  <td className="px-4 py-3 capitalize text-muted">{user.plan}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="font-mono text-xs tabular-nums text-faint">
                        {user.wordsUsed.toLocaleString()} / {user.limit.toLocaleString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted">{user.stripe_subscription_id ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(user.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
