import { DetectPageClient } from "@/components/detect-page";
import { loadOwnedRun, loadRunVersions } from "@/lib/load-run";

export default async function DetectPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run: runId } = await searchParams;
  const initialRun = runId ? await loadOwnedRun(runId, "detect") : null;
  const versions = initialRun ? await loadRunVersions(initialRun.id) : [];
  return <DetectPageClient initialRun={initialRun} versions={versions} />;
}
