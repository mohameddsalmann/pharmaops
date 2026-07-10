import Link from "next/link";
import { PageFadeIn } from "@/components/motion/PageFadeIn";
import { RevealOnScroll } from "@/components/motion/RevealOnScroll";
import {
  Cpu,
  ShieldCheck,
  Lock,
  Terminal,
  ArrowRight,
  CheckCircle2,
  Code2,
  Zap,
  Database,
  RefreshCw,
} from "lucide-react";

const integrationSteps = [
  {
    icon: ShieldCheck,
    title: "1. Configure HMAC Ingest Key",
    description: "Set PHARMAGUARD_INGEST_KEY in your environment. The Python SDK signs every request with HMAC-SHA256 — no API keys in URLs or client code.",
    code: `# .env.local
PHARMAGUARD_INGEST_KEY=your-secret-ingest-key`,
  },
  {
    icon: Cpu,
    title: "2. Start a Run Session",
    description: "Create a PharmaGuardClient and call start_run(). Returns a PharmaGuardRunSession that manages event sequencing and fail-open behavior.",
    code: `from pharmaguard_sdk import PharmaGuardClient

client = PharmaGuardClient(
    base_url="http://localhost:3000",
    api_key=os.environ["PHARMAGUARD_INGEST_KEY"],
)

session = client.start_run(
    pharmacy_id="PHARM-001",
    pharmacy_name="Central Pharmacy",
    pms_type="pioneer",
    workflow_type="prescription_intake",
    bot_version="1.0.0",
    workflow_spec_version="1.0.0",
)`,
  },
  {
    icon: Terminal,
    title: "3. Emit Telemetry Events",
    description: "Each step of your bot emits a typed event. PHI is automatically redacted before transmission. Failed events are spooled to SQLite for retry.",
    code: `session.emit_screen_read(
    screen_name="Patient Search",
    action_summary="Read patient search screen",
    confidence=0.95,
    duration_ms=1200,
    extracted_fields={"patientName": "[REDACTED]"},
)

session.emit_field_entry(
    screen_name="Data Entry",
    action_summary="Entered prescription fields",
    confidence=0.91,
    duration_ms=2200,
    entered_fields={"medicationName": "Lisinopril"},
)`,
  },
  {
    icon: CheckCircle2,
    title: "4. Complete & Evaluate",
    description: "Complete the run with a final outcome. PharmaGuard runs 7 deterministic evaluators and produces a release readiness score.",
    code: `session.complete(
    final_outcome="Prescription intake completed",
    status="completed",
    processed_item_count=1,
)`,
  },
];

const features = [
  {
    icon: Lock,
    title: "HMAC-SHA256 Authentication",
    description: "Every request is signed with method, path, timestamp, nonce, and body hash. Replay protection with atomic nonce claiming.",
  },
  {
    icon: RefreshCw,
    title: "Fail-Open Sessions",
    description: "Telemetry errors never crash your bot. Failed events are spooled to SQLite and retried with exponential backoff.",
  },
  {
    icon: Database,
    title: "SQLite Event Spool",
    description: "Process-safe, deduplicated by client_event_id. Survives restarts. WAL mode for concurrent writers.",
  },
  {
    icon: Zap,
    title: "BotCity Maestro Adapter",
    description: "Drop-in wrapper for BotCity Maestro tasks. Context manager auto-completes or fails runs on exit.",
  },
];

export default function IntegrationPage() {
  return (
    <PageFadeIn>
      <section className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4 flex flex-col justify-center">
          <div className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-accent-cyan/20 bg-accent-cyan/5 px-3 py-1 text-xs font-medium text-accent-cyan">
            <Cpu className="h-3.5 w-3.5" />
            BotCity Integration
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-[2.75rem] lg:leading-[1.1]">
            Connect Your Bot with PharmaGuard
          </h1>
          <p className="mt-4 max-w-xl text-base text-slate-400 md:text-lg">
            A Python SDK with HMAC authentication, per-run fail-open sessions, PHI redaction,
            and SQLite event spooling. Drop it into any BotCity automation or standalone bot.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/pms-sandbox" className="btn-primary btn-lg">
              <Terminal className="h-5 w-5" />
              Try Live Sandbox
            </Link>
            <Link
              href="https://github.com/mohameddsalmann/lail2/tree/main/integrations/botcity"
              className="btn-secondary btn-lg"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Code2 className="h-5 w-5" />
              View SDK Source
            </Link>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div className="card-bezel h-full">
            <div className="card-bezel-inner flex h-full flex-col justify-between p-6">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
                  <Zap className="h-3.5 w-3.5 text-accent-cyan" />
                  SDK at a Glance
                </div>
                {[
                  "HMAC-SHA256 signed requests",
                  "Per-run fail-open sessions",
                  "Automatic PHI redaction",
                  "SQLite event spool + retry",
                  "BotCity Maestro adapter",
                  "Python 3.9+ compatible",
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-status-green" />
                    <span className="text-sm text-slate-300">{item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 border-t border-navy-700/40 pt-4">
                <div className="font-mono-data text-[10px] text-slate-600">
                  pharmaguard_sdk · MIT · 42 tests passing
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-5 text-xl font-bold tracking-tight text-white">Getting Started in 4 Steps</h2>
        <div className="space-y-4">
          {integrationSteps.map((step, i) => {
            const Icon = step.icon;
            return (
              <RevealOnScroll key={step.title} delay={i * 60}>
                <div className="card">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start">
                    <div className="flex shrink-0 items-center gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-accent-cyan/10 ring-1 ring-accent-cyan/20">
                        <Icon className="h-5 w-5 text-accent-cyan" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h3 className="mb-1 text-base font-semibold text-white">{step.title}</h3>
                      <p className="mb-3 text-sm text-slate-400">{step.description}</p>
                      <pre className="overflow-x-auto rounded-lg border border-navy-700/60 bg-navy-900/80 p-4 text-xs leading-relaxed text-slate-300">
                        <code>{step.code}</code>
                      </pre>
                    </div>
                  </div>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="mb-5 text-xl font-bold tracking-tight text-white">Key Features</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <RevealOnScroll key={feature.title} delay={i * 80}>
                <div className="card card-hover h-full">
                  <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-navy-800/80 ring-1 ring-navy-600">
                    <Icon className="h-5 w-5 text-accent-cyan" />
                  </div>
                  <h3 className="mb-1.5 text-base font-semibold text-white">{feature.title}</h3>
                  <p className="text-sm text-slate-400">{feature.description}</p>
                </div>
              </RevealOnScroll>
            );
          })}
        </div>
      </section>

      <section className="mt-12">
        <RevealOnScroll>
          <div className="card">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">BotCity Maestro Integration</h3>
                <p className="mt-1 text-sm text-slate-400">
                  Use the PharmaGuardMaestroAdapter to connect Maestro task lifecycle to PharmaGuard runs.
                </p>
              </div>
              <Link href="/pms-sandbox" className="btn-primary btn-lg shrink-0">
                Try Live Sandbox
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <pre className="mt-4 overflow-x-auto rounded-lg border border-navy-700/60 bg-navy-900/80 p-4 text-xs leading-relaxed text-slate-300">
              <code>{`from pharmaguard_sdk import PharmaGuardMaestroAdapter, PharmaGuardRunContext

adapter = PharmaGuardMaestroAdapter(
    base_url=os.environ["PHARMAGUARD_API_URL"],
    api_key=os.environ["PHARMAGUARD_INGEST_KEY"],
)

with PharmaGuardRunContext(adapter, maestro, task) as session:
    session.emit_screen_read("Patient Search", "Read screen", 0.95, 1200)
    # ... automation steps ...
    # Run auto-completes on exit, or auto-fails on exception`}</code>
            </pre>
          </div>
        </RevealOnScroll>
      </section>

      <section className="mt-12">
        <RevealOnScroll>
          <div className="alert-warning flex items-start gap-3">
            <Lock className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-semibold">Security Notice</div>
              <div className="mt-1 text-xs opacity-90">
                The ingest key is never sent in request bodies or URLs. All authentication uses
                HMAC-SHA256 signatures with timestamp and nonce replay protection. PHI is redacted
                client-side before any network transmission. Sandbox routes use a separate signing
                secret and enforce rate limits per session.
              </div>
            </div>
          </div>
        </RevealOnScroll>
      </section>
    </PageFadeIn>
  );
}
