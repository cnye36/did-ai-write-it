import { redirect } from "next/navigation";
import { DetectEditorClient } from "@/components/detect/detect-editor";
import { loadOwnedRun, loadRunVersions } from "@/lib/load-run";

export default async function DetectEditorPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run: runId } = await searchParams;
  if (!runId) redirect("/app/detect");

  const run = await loadOwnedRun(runId, "detect");
  if (!run) redirect("/app/detect");

  const versions = await loadRunVersions(runId);

  return <DetectEditorClient run={run} versions={versions} />;
}
