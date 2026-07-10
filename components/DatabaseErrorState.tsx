import { AlertTriangle } from "lucide-react";

export function DatabaseErrorState({ message }: { message?: string }) {
  return (
    <div className="card flex items-center gap-3 p-6">
      <AlertTriangle className="h-6 w-6 shrink-0 text-amber-400" />
      <div>
        <h2 className="text-sm font-semibold text-white">Database is not initialized</h2>
        <p className="mt-1 text-xs text-slate-400">
          {message || "The Supabase schema has not been applied yet. Run supabase/schema.sql in the Supabase SQL Editor."}
        </p>
      </div>
    </div>
  );
}
