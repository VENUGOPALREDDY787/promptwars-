import React from 'react';
import { SimulationResult } from '../types';
import { Clock, AlertOctagon, Users, ShieldAlert, Ban, CheckCircle2 } from 'lucide-react';
import { formatDuration } from '../engine/simulation';

interface MetricsCardsProps {
  metrics: SimulationResult['metrics'];
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({ metrics }) => {
  const delayedPercent = Math.round((metrics.delayedFlightsCount / metrics.totalFlights) * 100);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
      {/* 1. Total Delay Minutes */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Network Delay</span>
          <Clock className={`w-4 h-4 ${metrics.totalDelayMinutes > 0 ? 'text-amber-400' : 'text-slate-500'}`} />
        </div>
        <div className="text-2xl font-bold font-mono text-white">
          {metrics.totalDelayMinutes.toLocaleString()} <span className="text-xs font-normal text-slate-400">mins</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
          <span>{formatDuration(metrics.totalDelayMinutes)}</span>
          {metrics.averageDelayMinutes > 0 && (
            <span className="text-amber-400 font-mono">avg {metrics.averageDelayMinutes}m/leg</span>
          )}
        </div>
        {metrics.totalDelayMinutes > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-rose-500" />
        )}
      </div>

      {/* 2. Delayed Flights */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Delayed Flights</span>
          <AlertOctagon className={`w-4 h-4 ${metrics.delayedFlightsCount > 0 ? 'text-amber-400' : 'text-emerald-400'}`} />
        </div>
        <div className="text-2xl font-bold font-mono text-white">
          {metrics.delayedFlightsCount} <span className="text-xs font-normal text-slate-400">/ {metrics.totalFlights}</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
          <span className={delayedPercent > 30 ? 'text-rose-400 font-semibold' : 'text-slate-400'}>
            {delayedPercent}% of fleet
          </span>
          <span className="text-emerald-400 font-mono">{metrics.onTimeFlightsCount} on time</span>
        </div>
        {metrics.delayedFlightsCount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-amber-500" />
        )}
      </div>

      {/* 3. Stranded Passengers */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Stranded Pax</span>
          <Users className={`w-4 h-4 ${metrics.strandedPassengersCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
        </div>
        <div className={`text-2xl font-bold font-mono ${metrics.strandedPassengersCount > 0 ? 'text-rose-400' : 'text-white'}`}>
          {metrics.strandedPassengersCount.toLocaleString()}
        </div>
        <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
          <span>{metrics.missedConnectionsCount} missed MCT</span>
          <span className="text-slate-500">of {metrics.totalPassengers.toLocaleString()}</span>
        </div>
        {metrics.strandedPassengersCount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500" />
        )}
      </div>

      {/* 4. Crew Duty Violations */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Crew Violations</span>
          <ShieldAlert className={`w-4 h-4 ${metrics.crewViolationsCount > 0 ? 'text-rose-500 animate-pulse' : 'text-slate-500'}`} />
        </div>
        <div className={`text-2xl font-bold font-mono ${metrics.crewViolationsCount > 0 ? 'text-rose-400' : 'text-white'}`}>
          {metrics.crewViolationsCount} <span className="text-xs font-normal text-slate-400">crews</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          {metrics.crewViolationsCount > 0 ? (
            <span className="text-rose-400 font-medium">Exceeded 12h Duty Limit</span>
          ) : (
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> All Crews Legal
            </span>
          )}
        </div>
        {metrics.crewViolationsCount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-600" />
        )}
      </div>

      {/* 5. Cancelled Flights */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider">Cancellations</span>
          <Ban className={`w-4 h-4 ${metrics.cancelledFlightsCount > 0 ? 'text-rose-400' : 'text-slate-500'}`} />
        </div>
        <div className="text-2xl font-bold font-mono text-white">
          {metrics.cancelledFlightsCount}
        </div>
        <div className="text-[11px] text-slate-400 mt-1">
          {metrics.cancelledFlightsCount > 0 ? (
            <span className="text-amber-400">Strategic Cut Applied</span>
          ) : (
            <span className="text-slate-400">0 legs grounded</span>
          )}
        </div>
        {metrics.cancelledFlightsCount > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-400" />
        )}
      </div>
    </div>
  );
};
