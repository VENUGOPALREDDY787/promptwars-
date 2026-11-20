import React from 'react';
import { SimulationResult } from '../types';
import { TrendingDown, ArrowDownRight, Users, Clock, ShieldAlert, Ban, CheckCircle2 } from 'lucide-react';
import { formatDuration } from '../engine/simulation';

interface ComparisonDiffProps {
  disruptedResult: SimulationResult;
  recoveredResult: SimulationResult;
}

export const ComparisonDiff: React.FC<ComparisonDiffProps> = ({
  disruptedResult,
  recoveredResult
}) => {
  const dMetrics = disruptedResult.metrics;
  const rMetrics = recoveredResult.metrics;

  const delaySaved = dMetrics.totalDelayMinutes - rMetrics.totalDelayMinutes;
  const delaySavedPercent = dMetrics.totalDelayMinutes > 0
    ? Math.round((delaySaved / dMetrics.totalDelayMinutes) * 100)
    : 0;

  const paxRescued = dMetrics.strandedPassengersCount - rMetrics.strandedPassengersCount;
  const flightsSaved = dMetrics.delayedFlightsCount - rMetrics.delayedFlightsCount;
  const crewViolationsAvoided = dMetrics.crewViolationsCount - rMetrics.crewViolationsCount;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl">
      {/* Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Before vs After AI Recovery Comparison
          </h3>
        </div>
        <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
          {recoveredResult.appliedActions.length} Actions Evaluated by Deterministic Engine
        </span>
      </div>

      {/* Side-by-Side Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
        {/* 1. Delay Saved */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Delay Recovered</span>
            <Clock className="w-4 h-4 text-emerald-400" />
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold font-mono text-emerald-400">
              -{delaySaved.toLocaleString()} <span className="text-xs font-normal text-emerald-300">mins</span>
            </div>
            <div className="text-xs text-emerald-500 font-semibold flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5" />
              {delaySavedPercent}% Delay Reduction ({formatDuration(delaySaved)})
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-between text-[11px] font-mono text-slate-400">
            <span>Disrupted: {dMetrics.totalDelayMinutes}m</span>
            <span className="text-white">Recovered: {rMetrics.totalDelayMinutes}m</span>
          </div>
        </div>

        {/* 2. Passengers Rescued */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Passengers Rescued</span>
            <Users className="w-4 h-4 text-sky-400" />
          </div>

          <div className="space-y-1">
            <div className={`text-2xl font-bold font-mono ${paxRescued > 0 ? 'text-sky-400' : 'text-slate-300'}`}>
              +{paxRescued} <span className="text-xs font-normal text-slate-400">passengers</span>
            </div>
            <div className="text-xs text-sky-400 font-medium">
              Saved from Missing MCT Hub Connection
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-between text-[11px] font-mono text-slate-400">
            <span>Stranded: {dMetrics.strandedPassengersCount}</span>
            <span className="text-white">Rescued to: {rMetrics.strandedPassengersCount}</span>
          </div>
        </div>

        {/* 3. Crew Violations Resolved */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Crew Violations</span>
            <ShieldAlert className="w-4 h-4 text-indigo-400" />
          </div>

          <div className="space-y-1">
            <div className={`text-2xl font-bold font-mono ${crewViolationsAvoided > 0 ? 'text-indigo-400' : 'text-slate-300'}`}>
              {crewViolationsAvoided > 0 ? `-${crewViolationsAvoided} Fixed` : '0 Active'}
            </div>
            <div className="text-xs text-indigo-300 font-medium">
              {rMetrics.crewViolationsCount === 0 ? '100% Crew Legality Restored' : `${rMetrics.crewViolationsCount} Violations Remaining`}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-between text-[11px] font-mono text-slate-400">
            <span>Before: {dMetrics.crewViolationsCount}</span>
            <span className="text-white">After: {rMetrics.crewViolationsCount}</span>
          </div>
        </div>

        {/* 4. Strategic Cancellations */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider">Net Cancellations</span>
            <Ban className="w-4 h-4 text-rose-400" />
          </div>

          <div className="space-y-1">
            <div className="text-2xl font-bold font-mono text-white">
              {rMetrics.cancelledFlightsCount} <span className="text-xs font-normal text-slate-400">flights</span>
            </div>
            <div className="text-xs text-slate-400">
              {rMetrics.cancelledFlightsCount > 0 
                ? 'Absorbed rotation to stop cascade' 
                : 'Zero flights sacrificed'}
            </div>
          </div>

          <div className="mt-3 pt-2 border-t border-slate-800/80 flex justify-between text-[11px] font-mono text-slate-400">
            <span>On-Time: {rMetrics.onTimeFlightsCount}</span>
            <span className="text-white">{Math.round((rMetrics.onTimeFlightsCount / rMetrics.totalFlights) * 100)}% On Time</span>
          </div>
        </div>
      </div>
    </div>
  );
};
