"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import { scenarios, type BotScenario } from "@/lib/botops/pms-sandbox/scenarios";
import { initialState, transition, type PmsSandboxState } from "@/lib/botops/pms-sandbox/pms-state";
import { actionToSummary, actionToEventType } from "@/lib/botops/pms-sandbox/pms-actions";
import { buildEventFromAction } from "@/lib/botops/pms-sandbox/event-builder";
import { formatEventActionType } from "@/lib/utils/format";
import {
  FlaskConical,
  Play,
  Loader2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Activity,
  Monitor,
} from "lucide-react";

type RunnerStatus = "idle" | "running" | "completed" | "error";

interface LiveEvent {
  stepNumber: number;
  screenName: string;
  actionType: string;
  actionSummary: string;
  status: string;
  confidence: number;
}

export function PmsSandboxClient() {
  const [status, setStatus] = useState<RunnerStatus>("idle");
  const [pmsState, setPmsState] = useState<PmsSandboxState>(initialState());
  const [liveEvents, setLiveEvents] = useState<LiveEvent[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
  const [error, setError] = useState<string | null>(null);
  const [activeScenario, setActiveScenario] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const prevEventCount = useRef(0);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

  const runScenario = useCallback(async (scenario: BotScenario) => {
    if (status === "running") return;
    cancelRef.current = false;
    setStatus("running");
    setActiveScenario(scenario.id);
    setError(null);
    setLiveEvents([]);
    setProgress({ current: 0, total: scenario.actions.length });

    let state = initialState();
    setPmsState(state);

    try {
      const sessionRes = await fetch("/api/botops/sandbox/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!sessionRes.ok) throw new Error("Failed to obtain sandbox session");
      const { token: demoToken } = await sessionRes.json();

      const startRes = await fetch("/api/botops/sandbox/runs/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-pharmaguard-demo-token": demoToken,
        },
        body: JSON.stringify({
          scenarioId: scenario.id,
        }),
      });
      if (!startRes.ok) throw new Error("Failed to start run");
      const startData = await startRes.json();
      const id = startData.run.id;
      setRunId(id);

      for (let i = 0; i < scenario.actions.length; i++) {
        if (cancelRef.current) break;

        const { action, config } = scenario.actions[i];
        const beforeState = state;
        state = transition(state, action);
        setPmsState(state);

        await sleep(600 + Math.random() * 600);

        if (cancelRef.current) break;

        const eventPayload = buildEventFromAction(
          id,
          i + 1,
          beforeState,
          state,
          action,
          config
        );

        const eventRes = await fetch(`/api/botops/sandbox/runs/${id}/events`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-pharmaguard-demo-token": demoToken,
          },
          body: JSON.stringify({
            clientEventId: `evt-${id}-${i + 1}`,
            ...eventPayload,
          }),
        });

        if (!eventRes.ok) {
          const errData = await eventRes.json().catch(() => ({}));
          throw new Error(errData.error ?? `Failed to emit event ${i + 1}`);
        }

        setLiveEvents((prev) => [
          ...prev,
          {
            stepNumber: eventPayload.stepNumber,
            screenName: eventPayload.screenName,
            actionType: eventPayload.actionType,
            actionSummary: eventPayload.actionSummary,
            status: eventPayload.status,
            confidence: eventPayload.confidence,
          },
        ]);
        prevEventCount.current = i + 1;
        setProgress({ current: i + 1, total: scenario.actions.length });
      }

      if (cancelRef.current) {
        setStatus("idle");
        return;
      }

      const completeRes = await fetch(`/api/botops/sandbox/runs/${id}/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-pharmaguard-demo-token": demoToken,
        },
        body: JSON.stringify({ finalOutcome: scenario.finalOutcome }),
      });
      if (!completeRes.ok) throw new Error("Failed to complete run");

      await fetch(`/api/botops/sandbox/runs/${id}/evaluate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-pharmaguard-demo-token": demoToken,
        },
        body: JSON.stringify({ useLlm: false }),
      });

      setStatus("completed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setStatus("error");
    }
  }, [status]);

  const reset = () => {
    setStatus("idle");
    setPmsState(initialState());
    setLiveEvents([]);
    setRunId(null);
    setProgress({ current: 0, total: 0 });
    setError(null);
    setActiveScenario(null);
    prevEventCount.current = 0;
  };

  const statusBadge = {
    idle: { text: "Idle", color: "text-slate-400", bg: "bg-slate-700/30", icon: Monitor },
    running: { text: "Running", color: "text-accent-cyan", bg: "bg-accent-cyan/10", icon: Activity },
    completed: { text: "Completed", color: "text-emerald-400", bg: "bg-emerald-500/10", icon: CheckCircle2 },
    error: { text: "Error", color: "text-red-400", bg: "bg-red-500/10", icon: XCircle },
  }[status];

  const StatusIcon = statusBadge.icon;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <FlaskConical className="h-6 w-6 text-accent-cyan" />
            PMS Sandbox
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Simulated pharmacy management system — run a live bot workflow and watch events stream in real time.
          </p>
        </div>
        <div className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ${statusBadge.bg} ${statusBadge.color}`}>
          <StatusIcon className={`h-4 w-4 ${status === "running" ? "animate-pulse" : ""}`} />
          {statusBadge.text}
        </div>
      </div>

      {error && (
        <div className="alert-danger flex items-center gap-2 text-sm">
          <AlertTriangle className="h-4 w-4" /> {error}
          <button onClick={reset} className="ml-auto text-xs underline">Reset</button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        {/* Left — PMS Screen Visualization (60%) */}
        <div className="lg:col-span-3">
          <div className="card-bezel overflow-hidden">
            {/* PMS Title Bar */}
            <div className="flex items-center justify-between border-b border-navy-700/50 bg-navy-900/60 px-4 py-2.5">
              <div className="flex items-center gap-2">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-500/50" />
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500/50" />
                </div>
                <span className="ml-3 font-mono-data text-sm text-slate-300">
                  PioneerRx PMS — {pmsState.currentScreen}
                </span>
              </div>
              <span className="text-[10px] text-slate-600">Synthetic Sandbox</span>
            </div>

            {/* PMS Screen Content */}
            <div className="card-bezel-inner min-h-[400px] p-6">
              <PmsScreen state={pmsState} />
            </div>

            {/* Progress bar */}
            {status === "running" && (
              <div className="border-t border-navy-700/50 px-4 py-2">
                <div className="flex items-center justify-between font-mono-data text-[10px] text-slate-500">
                  <span>Step {progress.current} of {progress.total}</span>
                  <span>{Math.round((progress.current / progress.total) * 100)}%</span>
                </div>
                <div className="mt-1 h-1 overflow-hidden rounded-full bg-navy-800">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-cyan/80 to-accent-cyan transition-all duration-300 ease-premium"
                    style={{ width: `${(progress.current / progress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right — Bot Runner Control Panel (40%) */}
        <div className="lg:col-span-2 space-y-4">
          {/* Scenario Buttons */}
          <div className="card">
            <h3 className="mb-3 text-sm font-semibold text-white">Bot Runner Scenarios</h3>
            {status === "idle" || status === "error" ? (
              <div className="space-y-2">
                {scenarios.map((scenario) => (
                  <button
                    key={scenario.id}
                    onClick={() => runScenario(scenario)}
                    className="group flex w-full items-center gap-3 rounded-lg border border-navy-700/60 bg-navy-800/40 px-4 py-3 text-left transition-all duration-200 ease-premium hover:-translate-y-0.5 hover:border-accent-cyan/40 hover:bg-navy-800/80 active:scale-[0.99]"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-cyan/10 ring-1 ring-accent-cyan/20 transition-all duration-200 ease-premium group-hover:ring-accent-cyan/40">
                      <Play className="h-4 w-4 text-accent-cyan" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-white">{scenario.name}</div>
                      <div className="truncate text-[10px] text-slate-500">{scenario.description}</div>
                    </div>
                  </button>
                ))}
              </div>
            ) : status === "running" ? (
              <div className="flex items-center gap-3 rounded-lg border border-accent-cyan/20 bg-accent-cyan/5 px-4 py-3">
                <Loader2 className="h-5 w-5 animate-spin text-accent-cyan" />
                <div>
                  <div className="text-sm font-medium text-accent-cyan">Bot is running...</div>
                  <div className="text-[10px] text-slate-400">Emitting events in real time</div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                  <div>
                    <div className="text-sm font-medium text-emerald-400">Run completed & evaluated</div>
                    <div className="font-mono-data text-[10px] text-slate-400">{liveEvents.length} events emitted</div>
                  </div>
                </div>
                {runId && (
                  <Link
                    href={`/runs/${runId}`}
                    className="btn-primary btn-sm w-full justify-center"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View Run Details
                  </Link>
                )}
                <button onClick={reset} className="btn-secondary btn-sm w-full justify-center">
                  Run Another Scenario
                </button>
              </div>
            )}
          </div>

          {/* Live Replay Link */}
          {runId && (status === "running" || status === "completed") && (
            <div className="card">
              <Link
                href={`/runs/${runId}`}
                className="flex items-center justify-between rounded-lg border border-accent-cyan/20 bg-accent-cyan/5 px-4 py-3 transition-all duration-200 ease-premium hover:bg-accent-cyan/10 active:scale-[0.99]"
              >
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-accent-cyan" />
                  <span className="text-sm font-medium text-accent-cyan">View Live Replay</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-accent-cyan" />
              </Link>
            </div>
          )}

          {/* Live Event Log */}
          <div className="card">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Activity className="h-4 w-4 text-slate-400" />
              Event Log
              {liveEvents.length > 0 && (
                <span className="rounded-full bg-navy-700/50 px-2 py-0.5 font-mono-data text-[10px] text-slate-400">
                  {liveEvents.length}
                </span>
              )}
            </h3>
            {liveEvents.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500">
                No events yet. Start a scenario to see live events.
              </div>
            ) : (
              <div className="scrollbar-thin max-h-[350px] space-y-1 overflow-y-auto">
                {liveEvents.map((event, idx) => {
                  const isNew = idx >= prevEventCount.current;
                  const isLatest = idx === liveEvents.length - 1 && status === "running";
                  const statusBorder = event.status === "failed"
                    ? "border-red-500/20 bg-red-500/5"
                    : event.status === "warning"
                      ? "border-amber-500/20 bg-amber-500/5"
                      : "border-navy-700/40 bg-navy-850/50";
                  const statusColor = event.status === "failed"
                    ? "text-red-400"
                    : event.status === "warning"
                      ? "text-amber-400"
                      : "text-emerald-400";
                  return (
                    <div
                      key={`evt-${event.stepNumber}`}
                      className={`rounded-lg border px-2.5 py-2 text-xs ${statusBorder} ${isLatest ? "ring-1 ring-accent-cyan/30" : ""} ${isNew ? "animate-slide-up" : ""}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono-data text-[10px] text-slate-500">#{event.stepNumber}</span>
                        <span className="text-slate-300">{event.screenName}</span>
                        <span className="rounded-full bg-navy-800 px-1.5 py-0.5 text-[9px] text-slate-400">
                          {formatEventActionType(event.actionType)}
                        </span>
                        <span className={`ml-auto text-[9px] font-medium ${statusColor}`}>
                          {event.status}
                        </span>
                      </div>
                      <p className="mt-0.5 text-slate-400">{event.actionSummary}</p>
                      <div className="mt-0.5 font-mono-data text-[9px] text-slate-600">conf: {event.confidence.toFixed(2)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PmsScreen({ state }: { state: PmsSandboxState }) {
  const screenFields: Record<string, Array<{ label: string; key: string }>> = {
    "Patient Search": [
      { label: "Patient Name", key: "patientName" },
    ],
    "Patient Match": [
      { label: "Patient ID", key: "patientId" },
      { label: "Patient Name", key: "patientName" },
    ],
    "Prescription Entry": [
      { label: "Medication Name", key: "medicationName" },
      { label: "Strength", key: "strength" },
      { label: "Quantity", key: "quantity" },
    ],
    "Insurance Check": [
      { label: "Coverage Status", key: "coverageStatus" },
    ],
    "Final Review": [
      { label: "Medication Name", key: "medicationName" },
      { label: "Strength", key: "strength" },
      { label: "Quantity", key: "quantity" },
    ],
  };

  const screenButtons: Record<string, string[]> = {
    "Patient Search": ["Search"],
    "Patient Match": ["Select Patient"],
    "Prescription Entry": ["Next"],
    "Insurance Check": ["Verify Coverage"],
    "Final Review": ["Submit"],
  };

  const fields = screenFields[state.currentScreen] ?? [];
  const buttons = screenButtons[state.currentScreen] ?? [];

  return (
    <div>
      <div className="mb-4 text-lg font-semibold text-white">{state.currentScreen}</div>

      {state.handoffState && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          <div>
            <div className="font-medium">Human Handoff Required</div>
            <div className="text-xs opacity-80">{state.handoffState.reason}</div>
          </div>
        </div>
      )}

      {state.errorState && !state.handoffState && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <XCircle className="h-4 w-4" />
          <div>
            <div className="font-medium">Error</div>
            <div className="text-xs opacity-80">{state.errorState}</div>
          </div>
        </div>
      )}

      {fields.length > 0 && (
        <div className="space-y-3">
          {fields.map((field) => {
            const value = state.fieldValues[field.key] ?? "";
            const isActive = state.activeElement === field.key;
            return (
              <div key={field.key}>
                <label className="mb-1 block text-xs font-medium text-slate-400">{field.label}</label>
                <div
                  className={`rounded-lg border px-3 py-2 text-sm transition-all ${
                    isActive
                      ? "border-accent-cyan/50 bg-accent-cyan/5 ring-2 ring-accent-cyan/20"
                      : value
                        ? "border-navy-600 bg-navy-800/50 text-slate-200"
                        : "border-navy-700/60 bg-navy-850/30 text-slate-600"
                  }`}
                >
                  {value || <span className="text-slate-600">—</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {state.currentScreen === "Patient Match" && state.selectedPatient && (
        <div className="mt-4 rounded-lg border border-navy-600 bg-navy-800/50 p-4">
          <div className="text-xs text-slate-500">Matched Patient</div>
          <div className="mt-1 text-sm text-slate-200">{state.selectedPatient.name}</div>
          <div className="text-[10px] text-slate-500">ID: {state.selectedPatient.id}</div>
        </div>
      )}

      {buttons.length > 0 && (
        <div className="mt-6 flex gap-3">
          {buttons.map((btn) => {
            const isAvailable = state.buttonAvailability[btn] ?? false;
            const isActive = state.activeElement === btn;
            return (
              <button
                key={btn}
                disabled
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-all ${
                  isActive
                    ? "border-accent-cyan/50 bg-accent-cyan/10 text-accent-cyan ring-2 ring-accent-cyan/20"
                    : isAvailable
                      ? "border-navy-600 bg-navy-700/40 text-slate-300"
                      : "border-navy-700/40 bg-navy-850/30 text-slate-600"
                }`}
              >
                {btn}
              </button>
            );
          })}
        </div>
      )}

      {state.currentScreen === "Idle" && (
        <div className="flex h-full min-h-[300px] items-center justify-center text-center">
          <div>
            <Monitor className="mx-auto h-12 w-12 text-slate-700" />
            <p className="mt-3 text-sm text-slate-500">PMS is idle. Start a bot scenario to begin.</p>
          </div>
        </div>
      )}
    </div>
  );
}
