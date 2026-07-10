"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle, Loader2, CheckCircle2, ShieldCheck, FileText, AlertTriangle, ScrollText } from "lucide-react";

interface GoldenDemoResult {
  success: boolean;
  totalCases: number;
  approvedCount: number;
  riskyStoppedCount: number;
  priorAuthRoutedCount: number;
  auditEventsCreated: number;
  error?: string;
}

const demoSteps = [
  { icon: CheckCircle2, title: "Clean case gets approved", description: "A complete eRx prescription with matching patient data passes all QA checks." },
  { icon: AlertTriangle, title: "DOB mismatch gets stopped", description: "A fax prescription with a date-of-birth mismatch is flagged for human review before automation continues." },
  { icon: FileText, title: "Prior authorization case routed", description: "A prescription requiring prior auth is identified and routed to the correct workflow." },
  { icon: ScrollText, title: "Audit trail created", description: "Every agent run and human action is logged for full traceability." },
];

export function GoldenDemoDialog({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GoldenDemoResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function runDemo() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/demo/golden", { method: "POST" });
      const data: GoldenDemoResult = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to run demo");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error occurred");
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    setOpen(false);
    if (result) {
      setResult(null);
      router.push("/dashboard");
    }
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="contents">
        {children}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-navy-950/80 backdrop-blur-sm" onClick={loading ? undefined : handleClose} />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-navy-600 bg-navy-850 p-6 shadow-elevated animate-slide-up">
            {!result && !loading && (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent-cyan/10">
                    <ShieldCheck className="h-5 w-5 text-accent-cyan" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Golden Demo</h2>
                    <p className="text-xs text-slate-400">How PharmaGuard Stops Risky Automation</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {demoSteps.map((step, i) => {
                    const Icon = step.icon;
                    return (
                      <div key={i} className="flex items-start gap-3 rounded-lg border border-navy-700/50 bg-navy-800/50 p-3">
                        <Icon className="mt-0.5 h-5 w-5 shrink-0 text-accent-cyan" />
                        <div>
                          <div className="text-sm font-medium text-slate-200">{step.title}</div>
                          <div className="mt-0.5 text-xs text-slate-400">{step.description}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {error && (
                  <div className="alert-danger mt-4 text-xs">{error}</div>
                )}
                <div className="mt-5 flex justify-end gap-3">
                  <button onClick={handleClose} className="btn-secondary">Cancel</button>
                  <button onClick={runDemo} className="btn-primary">
                    <PlayCircle className="h-4 w-4" /> Start Demo
                  </button>
                </div>
              </>
            )}
            {loading && (
              <div className="flex flex-col items-center py-12">
                <Loader2 className="h-10 w-10 animate-spin text-accent-cyan" />
                <p className="mt-4 text-sm text-slate-300">Running 8-agent QA pipeline on synthetic cases...</p>
                <p className="mt-1 text-xs text-slate-500">This may take a few seconds</p>
              </div>
            )}
            {result && !loading && (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-status-green/10">
                    <CheckCircle2 className="h-5 w-5 text-status-green" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">Golden Demo Complete</h2>
                    <p className="text-xs text-slate-400">All cases processed successfully</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg border border-status-green/20 bg-status-green/5 p-3">
                    <div className="text-2xl font-bold text-status-green">{result.approvedCount}</div>
                    <div className="text-xs text-slate-400">Approved Cases</div>
                  </div>
                  <div className="rounded-lg border border-status-amber/20 bg-status-amber/5 p-3">
                    <div className="text-2xl font-bold text-status-amber">{result.riskyStoppedCount}</div>
                    <div className="text-xs text-slate-400">Risky Cases Stopped</div>
                  </div>
                  <div className="rounded-lg border border-accent-cyan/20 bg-accent-cyan/5 p-3">
                    <div className="text-2xl font-bold text-accent-cyan">{result.priorAuthRoutedCount}</div>
                    <div className="text-xs text-slate-400">Prior Auth Routed</div>
                  </div>
                  <div className="rounded-lg border border-navy-600 bg-navy-800/50 p-3">
                    <div className="text-2xl font-bold text-slate-200">{result.auditEventsCreated}</div>
                    <div className="text-xs text-slate-400">Audit Events Created</div>
                  </div>
                </div>
                <div className="mt-5 flex justify-end gap-3">
                  <button onClick={handleClose} className="btn-primary">
                    View Dashboard →
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
