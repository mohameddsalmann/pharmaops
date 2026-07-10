import { getSeededBotOpsStore } from "@/lib/db/botops-index";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { RunDetailClient } from "@/components/botops/RunDetailClient";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function RunDetailPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = await params;
  const store = await getSeededBotOpsStore();
  const detail = await store.getRunDetail(runId);

  if (!detail) {
    notFound();
  }

  return (
    <PageFadeIn>
      <div className="mb-4">
        <Link href="/runs" className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200">
          <ArrowLeft className="h-4 w-4" /> Back to Runs
        </Link>
      </div>
      <RunDetailClient detail={detail} />
    </PageFadeIn>
  );
}
