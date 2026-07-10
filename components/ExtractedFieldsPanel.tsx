import type { ExtractedPrescription } from "@/lib/schemas/agents";
import type { PatientProfile } from "@/lib/schemas/case";
import { Check, X, AlertCircle, GitCompare } from "lucide-react";

interface ExtractedFieldsPanelProps {
  extraction: ExtractedPrescription;
  patientProfile?: PatientProfile | null;
}

export function ExtractedFieldsPanel({ extraction, patientProfile }: ExtractedFieldsPanelProps) {
  const fields: { label: string; value: string | number | null; profileValue?: string | null }[] = [
    { label: "Patient Name", value: extraction.patientName, profileValue: patientProfile?.name },
    { label: "Date of Birth", value: extraction.dateOfBirth, profileValue: patientProfile?.dateOfBirth },
    { label: "Medication", value: extraction.medicationName },
    { label: "Strength", value: extraction.strength },
    { label: "Directions", value: extraction.directions },
    { label: "Quantity", value: extraction.quantity },
    { label: "Refills", value: extraction.refills },
    { label: "Prescriber", value: extraction.prescriberName },
  ];

  const hasComparison = patientProfile && (patientProfile.name || patientProfile.dateOfBirth);

  return (
    <div className="card">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-slate-300">Extracted Fields</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">Confidence:</span>
          <span className={`font-mono text-sm font-bold ${
            extraction.extractionConfidence >= 0.9 ? "text-status-green" :
            extraction.extractionConfidence >= 0.75 ? "text-status-amber" : "text-status-red"
          }`}>
            {(extraction.extractionConfidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {fields.map((f) => {
          const mismatch = hasComparison && f.profileValue && f.value && f.value !== f.profileValue;
          return (
            <div key={f.label} className={`flex items-start gap-2 rounded-md bg-navy-800/50 p-2 ${
              mismatch ? "border border-status-red/30" : ""
            }`}>
              {mismatch ? (
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-status-red" />
              ) : f.value !== null && f.value !== undefined ? (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-status-green" />
              ) : (
                <X className="mt-0.5 h-4 w-4 shrink-0 text-status-red" />
              )}
              <div className="min-w-0">
                <div className="text-xs text-slate-400">{f.label}</div>
                <div className={`truncate text-sm ${f.value ? "text-slate-200" : "text-slate-600 italic"}`}>
                  {f.value ?? "Missing"}
                </div>
                {mismatch && (
                  <div className="mt-0.5 flex items-center gap-1 text-[10px] text-status-red">
                    <GitCompare className="h-3 w-3" />
                    Profile: {f.profileValue}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {extraction.missingFields.length > 0 && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-status-amber/10 p-2 text-xs text-status-amber">
          <AlertCircle className="h-4 w-4" />
          Missing fields: {extraction.missingFields.join(", ")}
        </div>
      )}
    </div>
  );
}
