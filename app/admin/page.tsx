import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/supabase/auth";
import { isAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { PLAN_LIMITS, wordsUsedInCurrentPeriod, type Plan } from "@/lib/usage";
import { PLAN_ORDER, PLAN_INFO } from "@/lib/plans";

interface ProfileRow {
  id: string;
  plan: Plan;
  stripe_subscription_id: string | null;
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
  // profiles/usage don't carry verification status; only auth.users does, so
  // confirmed-or-Google-verified filtering has to go through the Admin API
  // rather than a plain `.from("profiles")` select. listUsers() is paginated
  // (perPage below is a generous ceiling, not real pagination) - fine at
  // current scale, revisit once signups pass a few thousand.
  const [{ data: authData }, { data: profiles }, { data: usageRows }] = await Promise.all([
    service.auth.admin.listUsers({ perPage: 1000 }),
    service.from("profiles").select("id, plan, stripe_subscription_id"),
    service.from("usage").select("user_id, period_start, words_used"),
  ]);

  const profileById = new Map((profiles as ProfileRow[] | null)?.map((p) => [p.id, p]));
  const usageByUser = new Map((usageRows as UsageRow[] | null)?.map((u) => [u.user_id, u]));

  const allAuthUsers = authData?.users ?? [];
  const unconfirmedCount = allAuthUsers.filter((u) => !u.email_confirmed_at).length;

  const users = allAuthUsers
    .filter((u) => u.email_confirmed_at)
    .map((authUser) => {
      const profile = profileById.get(authUser.id);
      const usage = usageByUser.get(authUser.id);
      const plan = profile?.plan ?? "free";
      const wordsUsed = wordsUsedInCurrentPeriod(usage?.period_start, usage?.words_used);
      return {
        id: authUser.id,
        email: authUser.email ?? "(no email)",
        plan,
        stripeSubscriptionId: profile?.stripe_subscription_id ?? null,
        createdAt: authUser.created_at,
        provider: authUser.app_metadata?.provider ?? "email",
        wordsUsed,
        limit: PLAN_LIMITS[plan],
      };
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const planCounts = PLAN_ORDER.map((plan) => ({
    plan,
    count: users.filter((u) => u.plan === plan).length,
  }));

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-8 px-4 py-8 sm:px-6 lg:px-10">
      <div>
        <Link
          href="/app/detect"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon size={14} weight="bold" />
          Back to app
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-muted">
          Verified users, plans, and monthly usage. Unconfirmed signups are excluded below.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-6">
        <div className="rounded-2xl border border-line bg-raised p-4">
          <p className="text-xs text-faint">Verified users</p>
          <p className="mt-1 text-xl font-semibold tabular-nums">{users.length}</p>
        </div>
        {planCounts.map(({ plan, count }) => (
          <div key={plan} className="rounded-2xl border border-line bg-raised p-4">
            <p className="text-xs text-faint">{PLAN_INFO[plan].name}</p>
            <p className="mt-1 text-xl font-semibold tabular-nums">{count}</p>
          </div>
        ))}
        <div className="rounded-2xl border border-line bg-raised p-4">
          <p className="text-xs text-faint">Unconfirmed</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-muted">{unconfirmedCount}</p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-line bg-raised text-xs uppercase tracking-wide text-faint">
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Plan</th>
              <th className="px-4 py-3 font-medium">Usage</th>
              <th className="px-4 py-3 font-medium">Subscribed</th>
              <th className="px-4 py-3 font-medium">Signed up via</th>
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
                  <td className="px-4 py-3 text-muted">{user.stripeSubscriptionId ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 capitalize text-muted">{user.provider}</td>
                  <td className="px-4 py-3 text-muted">
                    {new Date(user.createdAt).toLocaleDateString(undefined, {
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
