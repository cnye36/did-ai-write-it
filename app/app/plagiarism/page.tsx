import { PlagiarismPageClient } from "@/components/plagiarism/plagiarism-page";
import { loadOwnedRun } from "@/lib/load-run";

export default async function PlagiarismPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run: runId } = await searchParams;
  const initialRun = runId ? await loadOwnedRun(runId, "plagiarism") : null;
  return <PlagiarismPageClient initialRun={initialRun} />;
}
