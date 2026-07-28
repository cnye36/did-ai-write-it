import { FactCheckPageClient } from "@/components/fact-check-page";
import { loadOwnedRun } from "@/lib/load-run";

export default async function FactCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run: runId } = await searchParams;
  const initialRun = runId ? await loadOwnedRun(runId, "fact_check") : null;
  return <FactCheckPageClient initialRun={initialRun} />;
}
