interface PrescriptionViewerProps {
  text: string;
}

export function PrescriptionViewer({ text }: PrescriptionViewerProps) {
  return (
    <div>
      <div className="mb-2 text-xs font-medium text-slate-500">Raw Prescription Text</div>
      <pre className="whitespace-pre-wrap rounded-lg bg-navy-950 p-3 font-mono text-xs leading-relaxed text-slate-300 ring-1 ring-navy-700/50">
        {text}
      </pre>
    </div>
  );
}
