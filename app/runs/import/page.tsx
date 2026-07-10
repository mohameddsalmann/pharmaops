"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { PageHeader } from "@/components/PageHeader";
import { Upload, FileJson, AlertTriangle, CheckCircle2, Lock } from "lucide-react";

export default function ImportRunPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [jsonText, setJsonText] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ runNumber: string; score: number; decision: string } | null>(null);

  const sampleJson = JSON.stringify(
    {
      runNumber: "BR-IMPORT-001",
      pharmacyId: "pharm-001",
      pharmacyName: "Demo Pharmacy",
      pmsType: "pioneer",
      workflowType: "prescription_intake",
      botVersion: "1.2.0",
      environment: "demo",
      baselineVersion: "1.2.0",
      events: [
        {
          stepNumber: 1,
          timestamp: new Date().toISOString(),
          screenName: "Patient Search",
          actionType: "screen_read",
          actionSummary: "Read patient search screen",
          confidence: 0.95,
          durationMs: 1200,
          status: "success",
        },
        {
          stepNumber: 2,
          timestamp: new Date(Date.now() + 2000).toISOString(),
          screenName: "Prescription Entry",
          actionType: "field_entry",
          actionSummary: "Entered medication name and strength",
          confidence: 0.92,
          durationMs: 3500,
          status: "success",
          enteredFields: { medicationName: "Lisinopril", strength: "10mg" },
        },
      ],
      expectedFields: { medicationName: "Lisinopril", strength: "10mg" },
      enteredFields: { medicationName: "Lisinopril", strength: "10mg" },
    },
    null,
    2
  );

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setJsonText(text);
      setError(null);
    };
    reader.readAsText(file);
  }

  function loadSample() {
    setJsonText(sampleJson);
    setError(null);
  }

  async function handleImport() {
    if (!jsonText.trim()) {
      setError("Please provide JSON data");
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonText);
    } catch (err) {
      setError(`Invalid JSON: ${err instanceof Error ? err.message : "parse error"}`);
      return;
    }

    setImporting(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/botops/runs/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Import failed");
        if (data.details) {
          setError(`${data.error}: ${JSON.stringify(data.details)}`);
        }
        return;
      }

      setSuccess({
        runNumber: data.run.runNumber,
        score: data.run.overallScore ?? 0,
        decision: data.run.decision ?? "pending",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setImporting(false);
    }
  }

  return (
    <PageFadeIn>
      <PageHeader
        title="Import Bot Run"
        description="Upload a bot run JSON file to evaluate it through the BotOps QA pipeline"
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="card">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Bot Run JSON</h3>
              <button onClick={loadSample} className="text-xs text-accent-cyan hover:underline">
                Load Sample
              </button>
            </div>

            <div className="mb-3 flex items-center gap-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary btn-sm"
              >
                <Upload className="h-4 w-4" /> Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                className="hidden"
              />
              <span className="text-xs text-slate-500">or paste JSON below</span>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              className="h-96 w-full rounded border border-navy-600 bg-navy-850 p-3 font-mono text-xs text-slate-200 focus:border-accent-cyan focus:outline-none"
              placeholder='{ "runNumber": "BR-001", ... }'
            />

            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={handleImport}
                disabled={importing || !jsonText.trim()}
                className="btn-primary"
              >
                <FileJson className="h-4 w-4" />
                {importing ? "Importing & Evaluating..." : "Import & Evaluate"}
              </button>
            </div>
          </div>

          {error && (
            <div className="alert-error flex items-start gap-2 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold">Import Failed</div>
                <div className="mt-1 text-xs opacity-90">{error}</div>
              </div>
            </div>
          )}

          {success && (
            <div className="alert-success flex items-start gap-2 text-sm">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold">Import Successful</div>
                <div className="mt-1 text-xs opacity-90">
                  Run <span className="font-mono">{success.runNumber}</span> evaluated — Score: {success.score}, Decision: {success.decision.replace(/_/g, " ")}
                </div>
                <button
                  onClick={() => router.push("/runs")}
                  className="mt-2 text-xs text-accent-cyan hover:underline"
                >
                  View All Runs →
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-white">Required Fields</h3>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><span className="font-mono text-slate-300">runNumber</span> — unique identifier</li>
              <li><span className="font-mono text-slate-300">pharmacyId</span> — pharmacy ID</li>
              <li><span className="font-mono text-slate-300">pharmacyName</span> — pharmacy name</li>
              <li><span className="font-mono text-slate-300">pmsType</span> — PMS system type</li>
              <li><span className="font-mono text-slate-300">workflowType</span> — workflow type</li>
              <li><span className="font-mono text-slate-300">botVersion</span> — bot version string</li>
              <li><span className="font-mono text-slate-300">events</span> — array of run events</li>
            </ul>
          </div>

          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-white">Optional Fields</h3>
            <ul className="space-y-1.5 text-xs text-slate-400">
              <li><span className="font-mono text-slate-300">environment</span> — demo/staging/production_redacted</li>
              <li><span className="font-mono text-slate-300">baselineVersion</span> — for regression comparison</li>
              <li><span className="font-mono text-slate-300">expectedFields</span> — expected field values</li>
              <li><span className="font-mono text-slate-300">enteredFields</span> — actual entered values</li>
            </ul>
          </div>

          <div className="alert-warning flex items-start gap-2">
            <Lock className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="text-xs">
              <div className="font-semibold">PHI Redaction</div>
              <div className="mt-1 opacity-90">
                All imported data is processed through the PHI redaction layer before evaluation. DOB, phone, email, SSN, and patient names are automatically redacted.
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageFadeIn>
  );
}
