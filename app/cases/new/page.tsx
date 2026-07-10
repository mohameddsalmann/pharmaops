"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { Send, AlertTriangle, Info, Sparkles, Loader2, ChevronRight, Lock } from "lucide-react";
import { sourceTypeOptions } from "@/lib/utils/format";
import { sampleCaseButtons, getSampleCaseTemplate } from "@/lib/mock/sample-cases";
import { isProduction } from "@/lib/utils/env";

export default function NewCasePage() {
  const router = useRouter();
  const [prescriptionText, setPrescriptionText] = useState("");
  const [sourceType, setSourceType] = useState("fax");
  const [patientProfile, setPatientProfile] = useState<Record<string, unknown> | null>(null);
  const [insuranceProfile, setInsuranceProfile] = useState<Record<string, unknown> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedSample, setLoadedSample] = useState<string | null>(null);

  function loadSample(id: string) {
    const template = getSampleCaseTemplate(id);
    if (!template) return;
    setPrescriptionText(template.prescriptionText);
    setSourceType(template.sourceType);
    setPatientProfile(template.patientProfile as Record<string, unknown>);
    setInsuranceProfile(template.insuranceProfile as Record<string, unknown>);
    setLoadedSample(id);
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prescriptionText.trim()) {
      setError("Prescription text is required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          prescriptionText: prescriptionText.trim(),
          ...(patientProfile ? { patientProfile } : {}),
          ...(insuranceProfile ? { insuranceProfile } : {}),
        }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || "Failed to create case");
      }
      const data = await res.json();
      router.push(`/cases/${data.caseId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Case"
        description="Submit a prescription for QA pipeline review"
      />

      {isProduction() ? (
        <PageFadeIn>
          <div className="card flex items-center gap-3 text-sm text-slate-600">
            <Lock className="h-5 w-5 shrink-0" />
            <div>
              <div className="font-medium text-slate-500">Enterprise authentication required</div>
              <div className="mt-0.5 text-xs">Case creation is an enterprise feature. The public demo is read-only.</div>
            </div>
          </div>
        </PageFadeIn>
      ) : (
      <PageFadeIn>
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left: Form */}
          <form onSubmit={handleSubmit} className="space-y-6 lg:col-span-2">
            <div className="card">
              <h2 className="mb-4 text-base font-semibold text-white">Prescription Input</h2>

              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Source Type
                </label>
                <select
                  value={sourceType}
                  onChange={(e) => setSourceType(e.target.value)}
                  className="input"
                >
                  {sourceTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-500">
                  How the prescription was received
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-200">
                  Prescription Text
                </label>
                <textarea
                  value={prescriptionText}
                  onChange={(e) => setPrescriptionText(e.target.value)}
                  rows={12}
                  placeholder={`Patient: Jane Smith
DOB: 03/15/1985
Address: 123 Main St, Springfield, IL 62701
Phone: (555) 123-4567
Insurance Member ID: XYZ123456789

Rx: Lisinopril 10mg
Sig: Take 1 tablet by mouth once daily
Qty: 30
Refills: 3
Prescriber: Dr. John Doe, MD
NPI: 1234567890`}
                  className="input font-mono text-sm leading-relaxed"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Paste the raw prescription text. Enter synthetic/demo data only.
                </p>
              </div>

              {loadedSample && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-accent-cyan/20 bg-accent-cyan/5 px-3 py-2 text-xs text-accent-cyan">
                  <Sparkles className="h-3.5 w-3.5" />
                  Loaded sample case with full patient and insurance profiles
                </div>
              )}

              {error && (
                <div className="mt-4 flex items-center gap-2 rounded-lg border border-status-red/20 bg-status-red/5 p-3">
                  <AlertTriangle className="h-5 w-5 shrink-0 text-status-red" />
                  <span className="text-sm text-status-red">{error}</span>
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Running QA Pipeline...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" /> Submit Case
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>

          {/* Right: Help + Samples */}
          <div className="space-y-4">
            <div className="card">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Info className="h-4 w-4 text-accent-cyan" />
                How this works
              </h3>
              <ol className="space-y-2.5 text-xs text-slate-400">
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-navy-700 text-[10px] font-bold text-slate-300">1</span>
                  <span>Enter or load a synthetic prescription</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-navy-700 text-[10px] font-bold text-slate-300">2</span>
                  <span>The 8-agent QA pipeline runs automatically</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-navy-700 text-[10px] font-bold text-slate-300">3</span>
                  <span>Review the decision, exceptions, and evidence on the case detail page</span>
                </li>
                <li className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-navy-700 text-[10px] font-bold text-slate-300">4</span>
                  <span>Take action: approve, reject, request info, or route to prior auth</span>
                </li>
              </ol>
            </div>

            <div className="card">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
                <Sparkles className="h-4 w-4 text-accent-cyan" />
                Load a sample case
              </h3>
              <p className="mb-3 text-xs text-slate-400">
                Load full synthetic data including patient and insurance profiles.
              </p>
              <div className="space-y-2">
                {sampleCaseButtons.map((sample) => (
                  <button
                    key={sample.id}
                    type="button"
                    onClick={() => loadSample(sample.id)}
                    className={`flex w-full items-center justify-between rounded-lg border px-3 py-2.5 text-left text-sm transition-all ${
                      loadedSample === sample.id
                        ? "border-accent-cyan/30 bg-accent-cyan/10 text-accent-cyan"
                        : "border-navy-700/50 bg-navy-800/50 text-slate-300 hover:border-navy-600 hover:bg-navy-800"
                    }`}
                  >
                    <span className="font-medium">{sample.label}</span>
                    <ChevronRight className="h-4 w-4 shrink-0 opacity-50" />
                  </button>
                ))}
              </div>
            </div>

            <div className="alert-warning">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <div className="text-xs">
                  <div className="font-semibold">Synthetic data only</div>
                  <div className="mt-0.5 opacity-90">Do not enter real patient information. This is a demo environment.</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </PageFadeIn>
      )}
    </div>
  );
}
