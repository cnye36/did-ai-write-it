import { DetectPageClient } from "@/components/detect-page";
import { loadOwnedRun } from "@/lib/load-run";

export default async function DetectPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run: runId } = await searchParams;
  const initialRun = runId ? await loadOwnedRun(runId, "detect") : null;
  return <DetectPageClient initialRun={initialRun} />;
}
