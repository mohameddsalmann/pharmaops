import Link from "next/link";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import {
  ShieldCheck,
  AlertTriangle,
  ScrollText,
  LayoutDashboard,
  ArrowRight,
  ScanSearch,
  Gauge,
  Cpu,
  Lock,
  CheckCircle2,
  FlaskConical,
  Activity,
  Terminal,
  Code2,
} from "lucide-react";

const whyItMatters = [
  {
    icon: ShieldCheck,
    title: "Certify bot runs deterministically",
    description: "7 deterministic evaluators check field accuracy, workflow compliance, exception handling, UI drift, loops/stalls, latency, and regression — no LLM guesses involved in pass/fail.",
    color: "text-status-green",
    bg: "bg-status-green/10",
    ring: "ring-status-green/20",
  },
  {
    icon: AlertTriangle,
    title: "Explain every failure",
    description: "Every evaluator result includes findings, deduction reasons, evidence event IDs, and recommended actions — so engineering knows exactly what to fix.",
    color: "text-status-amber",
    bg: "bg-status-amber/10",
    ring: "ring-status-amber/20",
  },
  {
    icon: ScrollText,
    title: "Full audit trail",
    description: "Every evaluation, QA review action, and import is logged in the BotOps audit log with timestamps and actor metadata for compliance traceability.",
    color: "text-accent-cyan",
    bg: "bg-accent-cyan/10",
    ring: "ring-accent-cyan/20",
  },
];

const workflowSteps = [
  { icon: FlaskConical, label: "PMS Sandbox" },
  { icon: Activity, label: "Bot Runner" },
  { icon: ScanSearch, label: "Live Events" },
  { icon: ShieldCheck, label: "Replay Timeline" },
  { icon: Gauge, label: "7 Evaluators" },
  { icon: CheckCircle2, label: "Release Decision" },
];

const audienceCards = [
  {
    title: "For QA Teams",
    subtitle: "Confidence in every release",
    icon: CheckCircle2,
    points: [
      "Review bot runs with replay timelines and field comparisons",
      "Approve, hold, or block automation with reviewer notes",
      "Track release readiness scores across workflow types",
      "PHI redacted before evaluation — safe for review",
    ],
    color: "text-accent-cyan",
    bg: "bg-accent-cyan/5",
    border: "border-accent-cyan/20",
  },
  {
    title: "For Engineering",
    subtitle: "Catch regressions before production",
    icon: Cpu,
    points: [
      "7 deterministic evaluators with explainable deductions",
      "Regression detection against captured baselines",
      "UI drift detection when screens or selectors change",
      "Loop/stall detection for stuck bot runs",
    ],
    color: "text-status-amber",
    bg: "bg-status-amber/5",
    border: "border-status-amber/20",
  },
];

export default async function HomePage() {
  let readiness: { status: string; checks?: Record<string, { status: string; detail?: string }> } | null = null;
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/api/readiness`, {
      cache: "no-store",
    });
    if (res.ok) readiness = await res.json();
  } catch {
    // silent — show static fallback
  }

  const storeOk = readiness?.checks?.store?.status === "ok";
  const supabaseConfigured = readiness?.checks?.supabase?.status === "configured";
  const hmacConfigured = readiness?.checks?.hmac?.status === "configured";

  return (
    <PageFadeIn>
      {/* Asymmetric hero — 7/5 split with double-bezel accent panel */}
      <section className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 flex flex-col justify-center">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-accent-cyan/20 bg-accent-cyan/5 px-3 py-1 text-xs font-medium text-accent-cyan">
            <ShieldCheck className="h-3.5 w-3.5" />
            BotOps QA & Replay Platform
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            QA & Certify Pharmacy Automation Bots
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-400 md:text-lg">
            PharmaGuard BotOps monitors, replays, evaluates, and certifies AI pharmacy bot runs across PMS systems. 7 deterministic evaluators, PHI redaction, risk scoring, and release readiness decisions — with full audit trails.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/integration" className="btn-primary btn-lg">
              <Terminal className="h-5 w-5" />
              Explore BotCity Integration
            </Link>
            <Link href="/pms-sandbox" className="btn-secondary btn-lg">
              <FlaskConical className="h-5 w-5" />
              Try PMS Sandbox
            </Link>
            <Link href="/dashboard" className="btn-secondary btn-lg">
              <LayoutDashboard className="h-5 w-5" />
              View Dashboard
            </Link>
          </div>
        </div>

        {/* Double-bezel hero accent panel */}
        <div className="lg:col-span-3">
          <div className="card-bezel h-full">
            <div className="card-bezel-inner flex h-full flex-col justify-between p-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Activity className="h-3.5 w-3.5 text-accent-cyan" />
                  Live BotOps Pipeline
                </div>
                {workflowSteps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <div key={step.label} className="flex items-center gap-3">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-navy-800/80 ring-1 ring-navy-700">
                        <Icon className="h-3.5 w-3.5 text-accent-cyan" />
                      </div>
                      <span className="text-sm text-slate-300">{step.label}</span>
                      {i < workflowSteps.length - 1 && (
                        <ArrowRight className="ml-auto h-3 w-3 text-slate-700" />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 border-t border-navy-700/40 pt-4">
                <div className="font-mono-data text-[10px] text-slate-600">
                  7 evaluators · deterministic scoring · PHI redacted
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-5 text-xl font-bold tracking-tight text-white">Why it matters</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {whyItMatters.map((item, i) => {
            const Icon = item.icon;
            return (
              <RevealOnScroll key={item.title} delay={i * 80}>
                <div className="card card-hover h-full">
                  <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg ${item.bg} ring-1 ${item.ring}`}>
                    <Icon className={`h-5 w-5 ${item.color}`} />
                  </div>
                  <h3 className="mb-1.5 text-base font-semibold text-white">{item.title}</h3>
                  <p className="text-sm text-slate-400">{item.description}</p>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <RevealOnScroll>
          <div className="card">
            <h2 className="mb-4 text-base font-semibold text-white">How a bot run flows through BotOps QA</h2>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-1">
              {workflowSteps.map((step, i) => {
                const Icon = step.icon;
                return (
                  <div key={step.label} className="flex items-center gap-3 lg:flex-1 lg:flex-col lg:text-center">
                    <div className="flex items-center gap-2.5 rounded-lg border border-navy-700/60 bg-navy-800/50 px-3 py-2.5 lg:w-full lg:flex-col lg:gap-2">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent-cyan/10">
                        <Icon className="h-4 w-4 text-accent-cyan" />
                      </div>
                      <span className="text-xs font-medium text-slate-300">{step.label}</span>
                    </div>
                    {i < workflowSteps.length - 1 && (
                      <ArrowRight className="h-4 w-4 shrink-0 text-slate-600 lg:rotate-90" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <section className="mt-12">
        <h2 className="mb-5 text-xl font-bold tracking-tight text-white">Built for your role</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {audienceCards.map((card, i) => {
            const Icon = card.icon;
            return (
              <RevealOnScroll key={card.title} delay={i * 100}>
                <div className={`card h-full ${card.border} ${card.bg}`}>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-navy-800/80 ring-1 ring-navy-600">
                      <Icon className={`h-5 w-5 ${card.color}`} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">{card.title}</h3>
                      <p className="text-xs text-slate-400">{card.subtitle}</p>
                    </div>
                  </div>
                  <ul className="space-y-2.5">
                    {card.points.map((point, j) => (
                      <li key={j} className="flex items-start gap-2.5 text-sm text-slate-300">
                        <CheckCircle2 className={`mt-0.5 h-4 w-4 shrink-0 ${card.color}`} />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <RevealOnScroll>
          <div className="card">
            <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
              <div className="flex-1">
                <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-accent-cyan/20 bg-accent-cyan/5 px-3 py-1 text-xs font-medium text-accent-cyan">
                  <Cpu className="h-3.5 w-3.5" />
                  BotCity Integration
                </div>
                <h2 className="mb-2 text-xl font-bold tracking-tight text-white">
                  Connect your bots with the PharmaGuard Python SDK
                </h2>
                <p className="max-w-2xl text-sm text-slate-400">
                  HMAC-SHA256 signed telemetry, per-run fail-open sessions, automatic PHI redaction,
                  and SQLite event spooling. Drop it into any BotCity automation or standalone bot.
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link href="/integration" className="btn-primary">
                    <Terminal className="h-4 w-4" />
                    Integration Guide
                  </Link>
                  <Link
                    href="https://github.com/mohameddsalmann/pharmaops/tree/main/integrations/botcity"
                    className="btn-secondary"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Code2 className="h-4 w-4" />
                    View SDK Source
                  </Link>
                </div>
              </div>
              <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-navy-700/60 bg-navy-900/80 p-4 font-mono-data text-xs text-slate-400">
                <div className={`flex items-center gap-2 ${storeOk ? "text-status-green" : "text-slate-500"}`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {storeOk ? "Store backend reachable" : "Store backend not checked"}
                </div>
                <div className={`flex items-center gap-2 ${supabaseConfigured ? "text-status-green" : "text-slate-500"}`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {supabaseConfigured ? "Supabase configured" : "Memory store (dev)"}
                </div>
                <div className={`flex items-center gap-2 ${hmacConfigured ? "text-status-green" : "text-slate-500"}`}>
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {hmacConfigured ? "HMAC ingest key set" : "HMAC key not set"}
                </div>
                <div className="flex items-center gap-2 text-status-green">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  SQLite spool + retry
                </div>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>

      <section className="mt-12">
        <RevealOnScroll>
          <div className="alert-warning flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Safety Notice</div>
              <div className="mt-1 text-xs opacity-90">
                PHI is redacted before evaluation. LLM summaries are for reviewer notes only and never influence pass/fail or release decisions. All scoring and decisions are deterministic.
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>
    </PageFadeIn>
  );
}
