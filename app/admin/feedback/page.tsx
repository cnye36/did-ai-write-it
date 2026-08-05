import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, BugIcon, ChatCircleTextIcon } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/supabase/auth";
import { isAdmin } from "@/lib/admin";
import { createServiceClient } from "@/lib/supabase/service";
import { FEEDBACK_KIND_LABEL, type FeedbackKind, type FeedbackRow } from "@/lib/feedback";

interface FeedbackWithUserId extends FeedbackRow {
  user_id: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function AdminFeedbackPage() {
  const { email } = await requireUser();
  if (!isAdmin(email)) redirect("/app/detect");

  const service = createServiceClient();
  const [{ data: rows }, { data: authData }] = await Promise.all([
    service
      .from("feedback")
      .select("id, user_id, kind, message, page_url, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    service.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailByUserId = new Map(authData?.users.map((u) => [u.id, u.email ?? "(no email)"]));
  const feedback = (rows ?? []) as FeedbackWithUserId[];

  return (
    <div className="mx-auto w-full max-w-[1000px] space-y-6 px-4 py-8 sm:px-6 lg:px-10">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-ink"
        >
          <ArrowLeftIcon size={14} weight="bold" />
          Admin
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Feedback</h1>
        <p className="mt-1 text-sm text-muted">
          Bug reports and feedback submitted from the app, newest first.
        </p>
      </div>

      {feedback.length === 0 ? (
        <p className="rounded-2xl border border-line bg-raised p-6 text-sm text-muted">
          Nothing submitted yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {feedback.map((item) => (
            <li key={item.id} className="rounded-2xl border border-line bg-raised p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      item.kind === "bug" ? "bg-bad-soft text-bad" : "bg-accent-soft text-accent"
                    }`}
                  >
                    {item.kind === "bug" ? (
                      <BugIcon size={13} weight="bold" />
                    ) : (
                      <ChatCircleTextIcon size={13} weight="bold" />
                    )}
                    {FEEDBACK_KIND_LABEL[item.kind as FeedbackKind]}
                  </span>
                  <span className="text-sm text-ink">{emailByUserId.get(item.user_id) ?? "Unknown"}</span>
                </div>
                <span className="text-xs text-faint">{formatDateTime(item.created_at)}</span>
              </div>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted">{item.message}</p>
              {item.page_url && (
                <p className="mt-2 font-mono text-xs text-faint">{item.page_url}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
