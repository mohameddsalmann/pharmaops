"use client";

import Link from "next/link";
import { useRole, type UserRole } from "@/lib/roles/role-context";
import { ShieldPlus, ChevronDown, PlayCircle, Upload, Lock, FlaskConical, ArrowRight } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { isProduction } from "@/lib/utils/env";

const roleLabels: Record<UserRole, string> = {
  admin: "Admin",
  pharmacist_reviewer: "Pharmacist Reviewer",
  qa_analyst: "QA Analyst",
};

export function TopNav() {
  const { role, setRole } = useRole();
  const [open, setOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  async function handleSeed() {
    setSeeding(true);
    try {
      await fetch("/api/botops/demo/seed", { method: "POST" });
      window.location.reload();
    } finally {
      setSeeding(false);
    }
  }

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-navy-700/60 bg-navy-900/90 px-4 backdrop-blur-md md:px-6">
      <Link href="/" className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent-cyan/10 ring-1 ring-accent-cyan/25">
          <ShieldPlus className="h-5 w-5 text-accent-cyan" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold tracking-tight text-white">PharmaGuard</span>
          <span className="hidden rounded-full bg-navy-700/40 px-2 py-0.5 text-[10px] font-medium text-slate-400 sm:inline">
            BotOps QA
          </span>
        </div>
      </Link>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden items-center gap-1.5 rounded-full border border-navy-700/50 bg-navy-800/40 px-2.5 py-1 text-xs text-slate-500 lg:flex">
          <Lock className="h-3 w-3 text-accent-cyan" />
          PHI redacted · Synthetic data only
        </div>

        <Link
          href="/pms-sandbox"
          className="group flex items-center gap-2 rounded-full bg-accent-cyan/10 px-3.5 py-2 text-sm font-medium text-accent-cyan ring-1 ring-accent-cyan/25 transition-all duration-200 ease-premium hover:bg-accent-cyan/15 hover:ring-accent-cyan/40 active:scale-[0.98]"
        >
          <FlaskConical className="h-4 w-4" />
          <span className="hidden sm:inline">Run Live PMS Bot</span>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-cyan/10 transition-transform duration-200 ease-premium group-hover:translate-x-0.5">
            <ArrowRight className="h-3 w-3" />
          </span>
        </Link>

        <button
          onClick={handleSeed}
          disabled={seeding || isProduction()}
          className="hidden items-center gap-2 rounded-lg px-3 py-2 text-xs text-slate-500 transition-all duration-200 ease-premium hover:bg-navy-800/60 hover:text-slate-300 active:scale-[0.98] md:flex"
          title={isProduction() ? "Enterprise authentication required" : undefined}
        >
          {isProduction() ? <Lock className="h-3.5 w-3.5" /> : <PlayCircle className="h-3.5 w-3.5" />}
          {isProduction() ? "Enterprise" : seeding ? "Seeding..." : "Seed Demo Runs"}
        </button>

        <Link href="/runs/import" className={`hidden items-center gap-2 rounded-lg px-3 py-2 text-xs transition-all duration-200 ease-premium md:flex ${isProduction() ? "cursor-not-allowed text-slate-600" : "text-slate-500 hover:bg-navy-800/60 hover:text-slate-300 active:scale-[0.98]"}`} title={isProduction() ? "Enterprise authentication required" : undefined}>
          {isProduction() ? <Lock className="h-3.5 w-3.5" /> : <Upload className="h-3.5 w-3.5" />}
          <span>{isProduction() ? "Enterprise" : "Import JSON"}</span>
        </Link>

        <div ref={ref} className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2 rounded-lg border border-navy-600 bg-navy-800 px-3 py-2 text-sm text-slate-200 transition-all duration-200 ease-premium hover:bg-navy-750 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-accent-cyan/40"
          >
            <span className="hidden text-xs text-slate-500 md:inline">Role:</span>
            <span className="font-medium">{roleLabels[role]}</span>
            <ChevronDown className="h-4 w-4 text-slate-500" />
          </button>
          {open && (
            <div className="absolute right-0 top-full z-50 mt-1 w-48 rounded-lg border border-navy-600 bg-navy-850 py-1 shadow-elevated">
              {(Object.keys(roleLabels) as UserRole[]).map((r) => (
                <button
                  key={r}
                  onClick={() => {
                    setRole(r);
                    setOpen(false);
                  }}
                  className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-navy-800 ${
                    r === role ? "text-accent-cyan" : "text-slate-200"
                  }`}
                >
                  {roleLabels[r]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
