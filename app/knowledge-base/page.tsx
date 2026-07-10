import { listKnowledgeDocs } from "@/lib/rag/retriever";
import { PageHeader } from "@/components/PageHeader";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { BookOpen, FileText, Info } from "lucide-react";

export default function KnowledgeBasePage() {
  const docs = listKnowledgeDocs();

  return (
    <div>
      <PageHeader
        title="Knowledge Base"
        description="SOPs, insurance rules, safety rules, and communication policies used by the compliance agent"
      />

      <PageFadeIn>
        <div className="mb-6 alert-info flex items-center gap-3">
          <Info className="h-5 w-5 shrink-0" />
          <span className="text-xs">
            The compliance agent retrieves evidence from these local documents to support compliance flags.
            Documents are loaded from <code className="font-mono text-accent-cyan">data/knowledge-base/</code> at runtime — no external API calls.
          </span>
        </div>

        {docs.length === 0 ? (
          <div className="card text-center text-sm text-slate-400">
            <BookOpen className="mx-auto mb-3 h-12 w-12 text-slate-600" />
            No knowledge base documents found. Add .md files to{" "}
            <code className="font-mono text-accent-cyan">data/knowledge-base/</code>
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {docs.map((doc) => (
              <div key={doc.filename} className="card card-hover">
                <div className="mb-3 flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-cyan/10">
                    <FileText className="h-4 w-4 text-accent-cyan" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold text-white">{doc.title}</h3>
                    <div className="mt-0.5 flex items-center gap-2">
                      <span className="badge-info">{doc.filename}</span>
                    </div>
                  </div>
                </div>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-navy-950 p-3 font-mono text-xs leading-relaxed text-slate-300">
                  {doc.content}
                </pre>
              </div>
            ))}
          </div>
        )}
      </PageFadeIn>
    </div>
  );
}
