"use client";

import { RoleProvider } from "@/lib/roles/role-context";
import { TopNav } from "./TopNav";
import { Sidebar } from "./Sidebar";
import { AlertTriangle, ShieldCheck, MessageSquareWarning, Lock } from "lucide-react";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <RoleProvider>
      <div className="flex min-h-screen flex-col bg-navy-950" style={{ isolation: "isolate" }}>
        <TopNav />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 overflow-x-hidden p-4 md:p-6 lg:p-8">
            <div className="mx-auto max-w-7xl">
              {children}
            </div>
          </main>
        </div>
        <footer className="border-t border-navy-700/60 bg-navy-900/50 px-6 py-4">
          <div className="mx-auto max-w-7xl space-y-2 text-xs text-slate-500">
            <div className="flex flex-wrap gap-4">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 text-status-amber" />
                Demo uses synthetic data only. Do not enter real patient information.
              </span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-accent-cyan" />
                Workflow assistance only — not a medical device or clinical decision system.
              </span>
            </div>
            <div className="flex flex-wrap gap-4">
              <span className="flex items-center gap-1.5">
                <MessageSquareWarning className="h-3.5 w-3.5 text-accent-cyan" />
                AI outputs require human review before use.
              </span>
              <span className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-slate-600" />
                HIPAA-aware but not certified compliant.
              </span>
            </div>
          </div>
        </footer>
      </div>
    </RoleProvider>
  );
}
