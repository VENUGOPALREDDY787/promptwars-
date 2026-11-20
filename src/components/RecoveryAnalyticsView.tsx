import React from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { formatDuration } from '../data/dataLoader';
import { 
  TrendingDown, 
  Sparkles, 
  ShieldCheck, 
  AlertTriangle, 
  RotateCcw, 
  CheckCircle2, 
  Ban, 
  Users, 
  Clock, 
  ArrowRight,
  Plane,
  Bot
} from 'lucide-react';

export const RecoveryAnalyticsView: React.FC = () => {
  const { 
    disruptedResult, 
    recoveredResult, 
    appliedActions, 
    removeRecoveryAction, 
    clearRecoveryActions,
    setAiModalOpen,
    scenario 
  } = useSimulatorStore();

  const dMetrics = disruptedResult.metrics;
  const rMetrics = recoveredResult.metrics;

  const delayDelta = dMetrics.totalDelayMinutes - rMetrics.totalDelayMinutes;
  const strandedDelta = dMetrics.passengersStranded - rMetrics.passengersStranded;
  const crewDelta = dMetrics.crewsOverDutyLimit - rMetrics.crewsOverDutyLimit;

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0A] text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1F1F1F] bg-[#111] flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            Operational Recovery Laboratory (Before vs After Diff Engine)
          </h2>
          <p className="text-xs text-slate-400">
            Audit deterministic deltas between unmitigated disruption baseline and recovery strategies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {appliedActions.length > 0 && (
            <button
              onClick={clearRecoveryActions}
              className="px-3 py-1.5 rounded-lg bg-[#181818] hover:bg-[#222] border border-[#2E2E2E] text-xs font-medium text-slate-300 flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset All Actions ({appliedActions.length})
            </button>
          )}
          <button
            onClick={() => setAiModalOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Bot className="w-3.5 h-3.5" /> Consult AI Dispatcher
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6 space-y-6">
        {/* KPI Delta Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Total Delay Savings */}
          <div className="p-4 rounded-xl bg-[#121212] border border-[#222]">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>TOTAL DELAY TIME</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">
                {formatDuration(rMetrics.totalDelayMinutes)}
              </span>
              <span className="text-xs font-mono text-slate-500 line-through">
                {formatDuration(dMetrics.totalDelayMinutes)}
              </span>
            </div>
            <div className="mt-2 text-xs font-mono">
              {delayDelta > 0 ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" /> Saved {delayDelta} mins ({Math.round((delayDelta / (dMetrics.totalDelayMinutes || 1)) * 100)}%)
                </span>
              ) : (
                <span className="text-slate-500">No delay savings applied</span>
              )}
            </div>
          </div>

          {/* Stranded Pax Delta */}
          <div className="p-4 rounded-xl bg-[#121212] border border-[#222]">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>STRANDED PASSENGERS</span>
              <Users className="w-4 h-4 text-rose-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">
                {rMetrics.passengersStranded}
              </span>
              <span className="text-xs font-mono text-slate-500 line-through">
                {dMetrics.passengersStranded}
              </span>
            </div>
            <div className="mt-2 text-xs font-mono">
              {strandedDelta > 0 ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Rescued {strandedDelta} passengers
                </span>
              ) : (
                <span className="text-slate-500">0 passenger changes</span>
              )}
            </div>
          </div>

          {/* Crew Violations Resolved */}
          <div className="p-4 rounded-xl bg-[#121212] border border-[#222]">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>CREW DUTY BREACHES</span>
              <AlertTriangle className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-white">
                {rMetrics.crewsOverDutyLimit}
              </span>
              <span className="text-xs font-mono text-slate-500 line-through">
                {dMetrics.crewsOverDutyLimit}
              </span>
            </div>
            <div className="mt-2 text-xs font-mono">
              {crewDelta > 0 ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Cleared {crewDelta} violations
                </span>
              ) : (
                <span className="text-slate-500">Legal duty limits intact</span>
              )}
            </div>
          </div>

          {/* Recovered Flights */}
          <div className="p-4 rounded-xl bg-[#121212] border border-[#222]">
            <div className="text-[11px] font-mono text-slate-400 flex items-center justify-between">
              <span>FLIGHT STATUS RATIO</span>
              <Plane className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-emerald-400">
                {rMetrics.flightsOnTime + rMetrics.flightsRecovered}
              </span>
              <span className="text-xs font-mono text-slate-400">/ 70 on-time</span>
            </div>
            <div className="mt-2 text-xs font-mono text-slate-400">
              {rMetrics.flightsCancelled} cancelled • {rMetrics.flightsDelayed} delayed
            </div>
          </div>
        </div>

        {/* Applied Recovery Actions Journal */}
        <div className="p-5 rounded-xl bg-[#121212] border border-[#222] space-y-4">
          <div className="flex items-center justify-between border-b border-[#222] pb-3">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              Applied Recovery Actions & Audit Trail ({appliedActions.length})
            </h3>
            <span className="text-xs text-slate-500 font-mono">100% Deterministic Engine Output</span>
          </div>

          {appliedActions.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs">
              No recovery actions have been applied to this disruption scenario yet.
              <div className="mt-2">
                <button
                  onClick={() => setAiModalOpen(true)}
                  className="text-cyan-400 hover:underline"
                >
                  Open AI Dispatcher to evaluate candidate actions ➔
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {appliedActions.map((act, idx) => (
                <div
                  key={act.id}
                  className="p-3.5 rounded-lg bg-[#161616] border border-[#262626] flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded bg-[#202020] border border-[#333] flex items-center justify-center font-mono text-xs font-bold text-slate-300">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        {act.title}
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-mono">
                          {act.type}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {act.description}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => removeRecoveryAction(act.id)}
                    className="px-2.5 py-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-medium transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
