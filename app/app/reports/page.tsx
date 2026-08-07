import { ReportsPageClient } from "@/components/reports/reports-page";
import { listOwnedRuns, REPORTS_PAGE_SIZE, type RunSort } from "@/lib/load-run";
import { RUN_KINDS, type RunKind } from "@/lib/runs";

const SORTS: RunSort[] = ["newest", "oldest", "score_desc", "score_asc"];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; q?: string; sort?: string; page?: string }>;
}) {
  const params = await searchParams;
  const kind = (RUN_KINDS as string[]).includes(params.kind ?? "") ? (params.kind as RunKind) : undefined;
  const sort = (SORTS as string[]).includes(params.sort ?? "") ? (params.sort as RunSort) : "newest";
  const page = Math.max(1, Number(params.page) || 1);
  const q = params.q ?? "";

  const { runs, total, counts } = await listOwnedRuns({ kind, q, sort, page });

  return (
    <ReportsPageClient
      runs={runs}
      total={total}
      counts={counts}
      pageSize={REPORTS_PAGE_SIZE}
      query={{ kind, q, sort, page }}
    />
  );
}
