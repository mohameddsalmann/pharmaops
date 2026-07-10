"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListOrdered,
  Upload,
  ClipboardCheck,
  TrendingUp,
  GitCompare,
  ScrollText,
  Home,
  FlaskConical,
  Lock,
  Terminal,
} from "lucide-react";
import { isProduction } from "@/lib/utils/env";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  enterprise?: boolean;
};

type NavGroup = {
  label: string;
  items: NavItem[];
};

const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [
      { href: "/pms-sandbox", label: "PMS Sandbox", icon: FlaskConical },
      { href: "/", label: "Overview", icon: Home },
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/runs", label: "Bot Runs", icon: ListOrdered },
      { href: "/runs/import", label: "Import Run", icon: Upload, enterprise: true },
      { href: "/integration", label: "Integration", icon: Terminal },
    ],
  },
  {
    label: "QA & Analysis",
    items: [
      { href: "/qa-review", label: "QA Review", icon: ClipboardCheck, enterprise: true },
      { href: "/drift", label: "UI Drift", icon: TrendingUp },
      { href: "/regression", label: "Regression", icon: GitCompare },
      { href: "/audit", label: "Audit Log", icon: ScrollText },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-60 shrink-0 border-r border-navy-700/60 bg-navy-900/50 md:block lg:w-64">
      <nav className="sticky top-16 space-y-6 p-4">
        {navGroups.map((group) => (
          <div key={group.label}>
            <div className="mb-2 px-3 text-[11px] font-medium tracking-normal text-slate-600">
              {group.label}
            </div>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const active = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
                const Icon = item.icon;
                const showLock = item.enterprise && isProduction();
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200 ease-premium ${
                      active
                        ? "bg-accent-cyan/8 text-accent-cyan"
                        : "text-slate-400 hover:bg-navy-800/40 hover:text-slate-200"
                    }`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-full bg-accent-cyan" />
                    )}
                    <Icon className={`h-4 w-4 shrink-0 ${active ? "text-accent-cyan" : "text-slate-600 group-hover:text-slate-400"}`} />
                    <span className="font-medium">{item.label}</span>
                    {showLock && (
                      <span className="ml-auto flex items-center gap-1 text-[10px] text-slate-600">
                        <Lock className="h-3 w-3" />
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
