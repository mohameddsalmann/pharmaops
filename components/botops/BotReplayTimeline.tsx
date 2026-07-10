"use client";

import { useRef, useEffect } from "react";
import type { BotRunEvent } from "@/lib/schemas/bot-run";
import { formatEventActionType } from "@/lib/utils/format";

const statusColor: Record<string, string> = {
  success: "text-emerald-400",
  warning: "text-amber-400",
  failed: "text-red-400",
};

const statusDot: Record<string, string> = {
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  failed: "bg-red-400",
};

export function BotReplayTimeline({ events, isLive }: { events: BotRunEvent[]; isLive?: boolean }) {
  const prevEventIds = useRef<Set<string>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isLive || !scrollRef.current) return;
    const el = scrollRef.current;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    if (isNearBottom) {
      el.scrollTop = el.scrollHeight;
    }
  }, [events, isLive]);

  useEffect(() => {
    prevEventIds.current = new Set(events.map((e) => e.id));
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-slate-400">
        {isLive ? "Waiting for events..." : "No events recorded for this run."}
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="scrollbar-thin max-h-[750px] space-y-1 overflow-y-auto">
      <div className="mb-3 flex items-center justify-between">
        <span className="font-mono-data text-[10px] text-slate-500">
          {events.length} event{events.length !== 1 ? "s" : ""}
        </span>
        {isLive && (
          <span className="flex items-center gap-1 text-[10px] font-medium text-accent-cyan">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-cyan" /> LIVE
          </span>
        )}
      </div>
      {events.map((event, idx) => {
        const isNew = isLive && !prevEventIds.current.has(event.id);
        const isLatest = idx === events.length - 1 && isLive;
        return (
          <div key={event.id} className={`relative flex gap-4 ${isNew ? "animate-slide-up" : ""}`}>
            {idx < events.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-px bg-navy-700/60" />
            )}
            <div className={`mt-1.5 h-3 w-3 shrink-0 rounded-full ${statusDot[event.status]} ring-2 ring-navy-900 ${isLatest ? "shadow-[0_0_8px_rgba(6,182,212,0.5)]" : ""}`} />
            <div className="flex-1 pb-4">
              <div className="flex items-center gap-2">
                <span className="font-mono-data text-xs text-slate-500">#{event.stepNumber}</span>
                <span className="text-sm font-medium text-slate-300">{event.screenName}</span>
                <span className="rounded-full bg-navy-800 px-1.5 py-0.5 text-[10px] text-slate-400">
                  {formatEventActionType(event.actionType)}
                </span>
                <span className={`text-[10px] font-medium ${statusColor[event.status]}`}>
                  {event.status}
                </span>
              </div>
              <p className="mt-1 text-sm text-slate-300">{event.actionSummary}</p>
              <div className="mt-1 flex items-center gap-3 font-mono-data text-[10px] text-slate-500">
                <span>conf: {event.confidence.toFixed(2)}</span>
                <span>{event.durationMs}ms</span>
                <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
              </div>
              {event.extractedFields && Object.keys(event.extractedFields).length > 0 && (
                <div className="mt-2 rounded border border-navy-700/40 bg-navy-850/50 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Extracted</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {Object.entries(event.extractedFields).map(([key, value]) => (
                      <span key={key} className="font-mono-data rounded bg-navy-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {event.enteredFields && Object.keys(event.enteredFields).length > 0 && (
                <div className="mt-1.5 rounded border border-navy-700/40 bg-navy-850/50 p-2">
                  <div className="text-[10px] uppercase tracking-wider text-slate-500">Entered</div>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {Object.entries(event.enteredFields).map(([key, value]) => (
                      <span key={key} className="font-mono-data rounded bg-navy-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
