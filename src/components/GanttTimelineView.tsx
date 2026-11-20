import React, { useState } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { minutesToTimeString, formatDuration } from '../data/dataLoader';
import { Plane, Users, Clock, AlertTriangle, ShieldCheck, ShieldAlert, Sparkles } from 'lucide-react';

export const GanttTimelineView: React.FC = () => {
  const { dataset, disruptedResult, recoveredResult, viewMode, setSelectedFlightId } = useSimulatorStore();
  const [tab, setTab] = useState<'AIRCRAFT' | 'CREW'>('AIRCRAFT');

  const currentResult = viewMode === 'AFTER' ? recoveredResult : disruptedResult;
  const flights = currentResult.flights;
  const crews = currentResult.crews;

  // Timeline: 05:00 (300m) to 24:00 (1440m) = 1140m total span
  const startDayMins = 300;
  const endDayMins = 1440;
  const totalMins = endDayMins - startDayMins;

  const timeMarkers = [
    { mins: 360, label: '06:00' },
    { mins: 480, label: '08:00' },
    { mins: 600, label: '10:00' },
    { mins: 720, label: '12:00' },
    { mins: 840, label: '14:00' },
    { mins: 960, label: '16:00' },
    { mins: 1080, label: '18:00' },
    { mins: 1200, label: '20:00' },
    { mins: 1320, label: '22:00' },
    { mins: 1440, label: '24:00' },
  ];

  const getPercent = (m: number) => {
    return Math.max(0, Math.min(100, ((m - startDayMins) / totalMins) * 100));
  };

  // Group flights by aircraft tail
  const tails = Array.from(new Set(flights.map(f => f.assignedTailId || f.tail_id))).sort();

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0A] text-slate-100 overflow-hidden">
      {/* View Header */}
      <div className="px-6 py-4 border-b border-[#1F1F1F] bg-[#111] flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            24-Hour Network Gantt Timeline
          </h2>
          <p className="text-xs text-slate-400">
            Interactive aircraft rotation chains and crew duty tracking across nominal vs disrupted schedules.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-[#181818] p-1 rounded-lg border border-[#2A2A2A]">
          <button
            onClick={() => setTab('AIRCRAFT')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tab === 'AIRCRAFT' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plane className="w-3.5 h-3.5" />
            Aircraft Rotations (16 Active + 2 Spares)
          </button>
          <button
            onClick={() => setTab('CREW')}
            className={`px-3 py-1.5 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              tab === 'CREW' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Crew Duty Rosters (10h Legal Cap)
          </button>
        </div>
      </div>

      {/* Gantt Content Area */}
      <div className="flex-1 overflow-auto p-6 space-y-4">
        {/* Time Axis Header */}
        <div className="flex items-center text-[11px] font-mono text-slate-500 border-b border-[#222] pb-2 pl-36 pr-4 relative">
          {timeMarkers.map(tm => (
            <div
              key={tm.mins}
              className="absolute -translate-x-1/2"
              style={{ left: `calc(144px + ${getPercent(tm.mins)}% * (100% - 160px) / 100)` }}
            >
              {tm.label}
            </div>
          ))}
          <div className="h-4"></div>
        </div>

        {tab === 'AIRCRAFT' ? (
          <div className="space-y-3">
            {tails.map(tailId => {
              const tailFlights = flights.filter(f => (f.assignedTailId || f.tail_id) === tailId);
              const isSpare = dataset.spare_aircraft.some(s => s.tail_id === tailId);

              return (
                <div key={tailId} className="flex items-center gap-4 group">
                  <div className="w-32 flex-shrink-0 flex items-center justify-between px-2 py-1.5 rounded bg-[#141414] border border-[#222]">
                    <span className="font-mono text-xs font-semibold text-white">{tailId}</span>
                    {isSpare ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold">
                        SPARE
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">{tailFlights.length} legs</span>
                    )}
                  </div>

                  {/* Timeline Track */}
                  <div className="flex-1 h-9 bg-[#121212] rounded border border-[#1E1E1E] relative overflow-hidden">
                    {/* Time Grid Lines */}
                    {timeMarkers.map(tm => (
                      <div
                        key={tm.mins}
                        className="absolute top-0 bottom-0 w-[1px] bg-[#1A1A1A]"
                        style={{ left: `${getPercent(tm.mins)}%` }}
                      />
                    ))}

                    {/* Flight Blocks */}
                    {tailFlights.map(f => {
                      const left = getPercent(f.actualDepMinutes);
                      const width = Math.max(2.5, getPercent(f.actualArrMinutes) - left);
                      const isDelayed = f.arrivalDelay > 0;
                      const isCancelled = f.status === 'CANCELLED';

                      return (
                        <div
                          key={f.flight_id}
                          onClick={() => setSelectedFlightId(f.flight_id)}
                          className={`absolute top-1 bottom-1 rounded px-2 text-[10px] flex items-center justify-between font-mono cursor-pointer transition-all hover:scale-[1.02] hover:z-20 shadow-sm ${
                            isCancelled
                              ? 'bg-rose-950/80 border border-rose-500/40 text-rose-300'
                              : isDelayed
                              ? 'bg-amber-950/80 border border-amber-500/40 text-amber-200'
                              : 'bg-cyan-950/80 border border-cyan-500/40 text-cyan-200'
                          }`}
                          style={{ left: `${left}%`, width: `${width}%` }}
                          title={`${f.flight_id}: ${f.origin} -> ${f.destination} (${f.dep} - ${f.arr}) | Delay: ${f.arrivalDelay}m`}
                        >
                          <span className="font-bold truncate">{f.flight_id}</span>
                          <span className="text-[9px] opacity-80 truncate">{f.origin}-{f.destination}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="space-y-3">
            {crews.map(cr => {
              const dutyPercent = Math.min(100, (cr.accumulatedDutyMinutes / cr.max_duty_mins) * 100);
              const left = getPercent(cr.dutyStartMinutes);
              const width = Math.max(4, getPercent(cr.actualDutyEndMinutes) - left);

              return (
                <div key={cr.crew_id} className="flex items-center gap-4 group">
                  <div className="w-32 flex-shrink-0 flex items-center justify-between px-2 py-1.5 rounded bg-[#141414] border border-[#222]">
                    <div>
                      <div className="font-mono text-xs font-semibold text-white">{cr.crew_id}</div>
                      <div className="text-[10px] text-slate-500">Base: {cr.base}</div>
                    </div>
                    {cr.isBreached ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> BREACH
                      </span>
                    ) : (
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {Math.round(cr.accumulatedDutyMinutes / 60 * 10) / 10}h / 10h
                      </span>
                    )}
                  </div>

                  {/* Timeline Track */}
                  <div className="flex-1 h-9 bg-[#121212] rounded border border-[#1E1E1E] relative overflow-hidden">
                    {timeMarkers.map(tm => (
                      <div
                        key={tm.mins}
                        className="absolute top-0 bottom-0 w-[1px] bg-[#1A1A1A]"
                        style={{ left: `${getPercent(tm.mins)}%` }}
                      />
                    ))}

                    <div
                      className={`absolute top-1 bottom-1 rounded px-2.5 text-[10px] flex items-center justify-between font-mono ${
                        cr.isBreached
                          ? 'bg-rose-950/80 border border-rose-500/50 text-rose-200'
                          : 'bg-emerald-950/80 border border-emerald-500/40 text-emerald-200'
                      }`}
                      style={{ left: `${left}%`, width: `${width}%` }}
                    >
                      <span className="font-bold">{cr.crew_id} Duty ({formatDuration(cr.accumulatedDutyMinutes)})</span>
                      <span className="text-[9px] opacity-80">{cr.flight_ids.join(' ➔ ')}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
