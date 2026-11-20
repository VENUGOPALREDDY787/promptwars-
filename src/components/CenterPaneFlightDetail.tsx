import React, { useState } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { 
  Copy, 
  Check, 
  Plane, 
  AlertTriangle, 
  Users, 
  ShieldAlert, 
  Clock, 
  ArrowRight, 
  GitCommit, 
  Sparkles,
  Info
} from 'lucide-react';
import { minutesToTimeString, formatDuration } from '../data/dataLoader';

export const CenterPaneFlightDetail: React.FC = () => {
  const { 
    selectedFlightId, 
    disruptedResult, 
    recoveredResult, 
    viewMode, 
    scenario, 
    dataset 
  } = useSimulatorStore();

  const [copied, setCopied] = useState(false);

  const currentResult = viewMode === 'AFTER' ? recoveredResult : disruptedResult;
  const flight = currentResult.flights.find(f => f.flight_id === selectedFlightId) || currentResult.flights[0];

  if (!flight) {
    return (
      <div className="w-[420px] flex-shrink-0 bg-[#0A0A0A] border-r border-[#222] p-6 text-center text-slate-500 text-xs">
        Select a flight from the manifest or map to view details.
      </div>
    );
  }

  // Find associated Crew
  const crew = currentResult.crews.find(c => c.flight_ids.includes(flight.flight_id));

  // Find associated connecting passenger groups (where from_flight or to_flight is this flight)
  const connections = currentResult.connections.filter(c => 
    c.from_flight === flight.flight_id || c.to_flight === flight.flight_id
  );

  const isDelayed = flight.arrivalDelay > 0 && flight.status !== 'CANCELLED';
  const isCancelled = flight.status === 'CANCELLED';
  const isRecovered = flight.status === 'RECOVERED' || flight.isRecovered;

  const handleCopy = () => {
    navigator.clipboard.writeText(flight.flight_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Progress Bar Calculations
  // Total span from scheduled departure to actual arrival
  const progressStart = flight.stdMinutes;
  const progressEnd = Math.max(flight.staMinutes, flight.actualArrMinutes);
  const progressSpan = Math.max(1, progressEnd - progressStart);

  // Check closure overlap for hatched segment
  let closureStartRelPercent = 0;
  let closureWidthPercent = 0;
  if (scenario && (flight.origin === scenario.airportCode || flight.destination === scenario.airportCode)) {
    const cStart = Math.max(progressStart, scenario.closeStartMinutes);
    const cEnd = Math.min(progressEnd, scenario.closeEndMinutes);
    if (cEnd > cStart) {
      closureStartRelPercent = ((cStart - progressStart) / progressSpan) * 100;
      closureWidthPercent = ((cEnd - cStart) / progressSpan) * 100;
    }
  }

  return (
    <div className="w-[420px] flex-shrink-0 bg-[#0A0A0A] border-r border-[#222] flex flex-col h-[calc(100vh-3.5rem-4.5rem)] overflow-y-auto p-4 space-y-4 select-none">
      {/* 1. Header Card */}
      <div className="bg-[#141414] border border-[#222] rounded-2xl p-4">
        {/* Top Status & Timestamp Pill */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            {isCancelled ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                CANCELLED
              </span>
            ) : isRecovered ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> RECOVERED
              </span>
            ) : isDelayed ? (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                DELAYED
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                ON TIME
              </span>
            )}
            <span className="text-[10px] text-slate-500 font-mono">
              Leg {flight.leg_order} of 5
            </span>
          </div>

          <div className="text-[11px] font-mono text-slate-400">
            {flight.dep} IST
          </div>
        </div>

        {/* Flight Number & Tail Header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold font-mono text-white tracking-tight">
                {flight.flight_id}
              </span>
              <button
                onClick={handleCopy}
                className="p-1 rounded hover:bg-[#222] text-slate-400 hover:text-white transition-colors"
                title="Copy Flight ID"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
            <div className="text-xs text-slate-400 font-mono mt-0.5">
              Aircraft: <span className="text-cyan-400 font-bold">{flight.assignedTailId}</span> (A320neo)
            </div>
          </div>

          {/* Airline Logo Badge */}
          <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
            <Plane className="w-6 h-6 text-cyan-400 -rotate-45" />
          </div>
        </div>

        {/* Aircraft Hero Silhouette Card */}
        <div className="mt-3 p-3 rounded-xl bg-[#0D0D0D] border border-[#1F1F1F] flex items-center justify-between">
          <div className="text-xs">
            <div className="font-bold text-slate-200">Domino Sky Fleet</div>
            <div className="text-[10px] text-slate-500 font-mono">Single-Aisle • 180 Seats</div>
          </div>
          <div className="text-right text-xs font-mono">
            <div className="text-slate-300 font-semibold">{flight.pax} Booked</div>
            <div className="text-[10px] text-cyan-400">{Math.round((flight.pax / 180) * 100)}% Load Factor</div>
          </div>
        </div>
      </div>

      {/* 2. Route Schedule vs Actual Boxes */}
      <div className="grid grid-cols-2 gap-3">
        {/* Origin */}
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-3.5">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Departure</div>
          <div className="text-xl font-bold font-mono text-white">{flight.origin}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            Sched: <span className="font-mono text-slate-300">{flight.dep}</span>
          </div>
          <div className="text-xs font-mono font-bold mt-0.5 flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Est:</span>
            <span className={flight.departureDelay > 0 ? 'text-amber-400' : 'text-emerald-400'}>
              {minutesToTimeString(flight.actualDepMinutes)}
              {flight.departureDelay > 0 && ` (+${flight.departureDelay}m)`}
            </span>
          </div>
        </div>

        {/* Destination */}
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-3.5">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1">Arrival</div>
          <div className="text-xl font-bold font-mono text-white">{flight.destination}</div>
          <div className="text-[10px] text-slate-400 mt-1">
            Sched: <span className="font-mono text-slate-300">{flight.arr}</span>
          </div>
          <div className="text-xs font-mono font-bold mt-0.5 flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Est:</span>
            <span className={flight.arrivalDelay > 0 ? 'text-amber-400' : 'text-emerald-400'}>
              {minutesToTimeString(flight.actualArrMinutes)}
              {flight.arrivalDelay > 0 && ` (+${flight.arrivalDelay}m)`}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Leg Progress Bar with Hatched Closure Overlay */}
      <div className="bg-[#141414] border border-[#222] rounded-2xl p-3.5 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
          <span>Block Time: {flight.block_minutes}m</span>
          {flight.delayAbsorbedMinutes > 0 && (
            <span className="text-emerald-400 font-semibold">
              Turnaround Absorbed {flight.delayAbsorbedMinutes}m
            </span>
          )}
        </div>

        {/* Visual Progress Bar */}
        <div className="h-3 w-full bg-[#0A0A0A] rounded-full border border-[#222] relative overflow-hidden">
          {/* Base flight duration fill */}
          <div 
            className={`h-full rounded-full ${
              isCancelled 
                ? 'bg-rose-500/40' 
                : isDelayed 
                ? 'bg-amber-500/50' 
                : 'bg-cyan-500/50'
            }`}
            style={{ width: '100%' }}
          />

          {/* Hatched closure window overlay */}
          {closureWidthPercent > 0 && (
            <div
              className="absolute top-0 bottom-0 bg-rose-500/40 border-l border-r border-rose-400/80"
              style={{
                left: `${closureStartRelPercent}%`,
                width: `${closureWidthPercent}%`,
                backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(244, 63, 94, 0.4) 3px, rgba(244, 63, 94, 0.4) 6px)'
              }}
              title="Closure Window Interval"
            />
          )}
        </div>

        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>{minutesToTimeString(progressStart)}</span>
          {closureWidthPercent > 0 && (
            <span className="text-rose-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500 inline-block animate-ping" />
              Closure Overlap
            </span>
          )}
          <span>{minutesToTimeString(progressEnd)}</span>
        </div>
      </div>

      {/* 4. Two Status Cards: Delay & Passengers Stranded */}
      <div className="grid grid-cols-2 gap-3">
        {/* Delay & Root Cause Card */}
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-3.5">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
            <Clock className="w-3 h-3 text-amber-400" /> Delay Severity
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {isCancelled ? (
              <span className="text-rose-400">Cancelled</span>
            ) : flight.arrivalDelay > 0 ? (
              <span className="text-amber-400">+{flight.arrivalDelay} min</span>
            ) : (
              <span className="text-emerald-400">0 min</span>
            )}
          </div>
          <div className="text-[10px] text-slate-400 font-semibold mt-1 truncate">
            {flight.delayRootCause === 'AIRCRAFT_ROTATION' ? 'ROTATION CASCADE' :
             flight.delayRootCause === 'ROOT_CLOSURE' ? 'AIRPORT CLOSURE' :
             flight.delayRootCause === 'CREW_DUTY' ? 'CREW TIMEOUT' : 'NOMINAL ON TIME'}
          </div>
        </div>

        {/* Passengers Stranded Card */}
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-3.5">
          <div className="text-[10px] uppercase font-bold text-slate-500 mb-1 flex items-center gap-1">
            <Users className="w-3 h-3 text-rose-400" /> Pax Stranded
          </div>
          <div className="text-lg font-bold font-mono text-white">
            {flight.passengersAffected > 0 ? (
              <span className="text-rose-400">{flight.passengersAffected} pax</span>
            ) : (
              <span className="text-slate-400">0 pax</span>
            )}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-1">
            {flight.passengersAffected > 0 ? 'Missed MCT or Grounded' : 'All Connections Intact'}
          </div>
        </div>
      </div>

      {/* 5. Causal Chain: "Why is this flight late?" */}
      <div className="bg-[#141414] border border-[#222] rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[#222]">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white tracking-wide">
            <GitCommit className="w-4 h-4 text-cyan-400" />
            <span>Why is this flight late?</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500 bg-[#0A0A0A] px-2 py-0.5 rounded border border-[#222]">
            {flight.causeChain.length} Steps
          </span>
        </div>

        {/* Step List */}
        <div className="space-y-2.5">
          {flight.causeChain.map((step, idx) => (
            <div key={idx} className="flex items-start gap-2 text-xs">
              <div className="flex flex-col items-center">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold ${
                  step.type === 'CLOSURE'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                    : step.type === 'ROTATION'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                    : step.type === 'ABSORPTION' || step.type === 'RECOVERY'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {step.step}
                </span>
                {idx < flight.causeChain.length - 1 && (
                  <div className="w-[1px] h-4 bg-[#262626] my-1" />
                )}
              </div>

              <div className="flex-1 bg-[#0A0A0A] p-2.5 rounded-xl border border-[#1E1E1E]">
                <div className="text-[11px] text-slate-300 font-medium leading-relaxed">
                  {step.description}
                </div>
                {step.minutes > 0 && (
                  <div className="mt-1 flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-500 uppercase font-bold">{step.type}</span>
                    <span className="text-amber-400 font-bold">+{step.minutes} mins</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 6. Crew Card */}
      {crew && (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#222] mb-3">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <ShieldAlert className={`w-4 h-4 ${crew.isBreached ? 'text-rose-500 animate-pulse' : 'text-cyan-400'}`} />
              <span>Assigned Crew ({crew.crew_id})</span>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
              crew.isBreached
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              {crew.isBreached ? 'DUTY LIMIT BREACH' : 'LEGAL'}
            </span>
          </div>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between text-slate-400">
              <span>Home Base:</span>
              <span className="text-white font-semibold">{crew.base}</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Duty Start:</span>
              <span className="text-slate-200">{crew.duty_start} IST</span>
            </div>
            <div className="flex justify-between text-slate-400">
              <span>Duty Elapsed:</span>
              <span className={crew.isBreached ? 'text-rose-400 font-bold' : 'text-slate-200'}>
                {formatDuration(crew.accumulatedDutyMinutes)} / {formatDuration(crew.max_duty_mins)} max
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 7. Passenger Connections Card */}
      {connections.length > 0 && (
        <div className="bg-[#141414] border border-[#222] rounded-2xl p-4 space-y-2">
          <div className="flex items-center justify-between pb-2 border-b border-[#222]">
            <div className="flex items-center gap-1.5 text-xs font-bold text-white">
              <Users className="w-4 h-4 text-cyan-400" />
              <span>Connecting Hub Groups ({connections.length})</span>
            </div>
          </div>

          <div className="space-y-2">
            {connections.map(c => {
              const isMissed = c.status === 'MISSED' || c.status === 'STRANDED';

              return (
                <div key={c.connection_id} className="p-2.5 rounded-xl bg-[#0A0A0A] border border-[#222] text-xs font-mono">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-300">
                      {c.from_flight} ➔ {c.to_flight}
                    </span>
                    <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      isMissed ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'
                    }`}>
                      {c.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>{c.passengers} passengers at {c.airport}</span>
                    <span className={c.slackMinutes < 0 ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                      {c.slackMinutes < 0 ? `${c.slackMinutes}m (MISSED MCT)` : `+${c.slackMinutes}m slack`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
