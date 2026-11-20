import React, { useState } from 'react';
import { SimulatedFlight, Aircraft, SimulatedCrewPairing } from '../types';
import { formatMinutesToTime } from '../engine/simulation';
import { Plane, Users, Clock, AlertTriangle, ShieldAlert } from 'lucide-react';

interface GanttTimelineProps {
  flights: SimulatedFlight[];
  aircraft: Aircraft[];
  crews: SimulatedCrewPairing[];
}

export const GanttTimeline: React.FC<GanttTimelineProps> = ({
  flights,
  aircraft,
  crews
}) => {
  const [activeTab, setActiveTab] = useState<'AIRCRAFT' | 'CREW'>('AIRCRAFT');

  // Timeline window: 06:00 (360m) to 23:30 (1410m) -> 1050 minutes span
  const startDayMinutes = 360;
  const endDayMinutes = 1410;
  const totalDaySpan = endDayMinutes - startDayMinutes;

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
  ];

  const getPercent = (mins: number) => {
    return Math.max(0, Math.min(100, ((mins - startDayMinutes) / totalDaySpan) * 100));
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl">
      {/* Tab Switcher & Title */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <Clock className="w-5 h-5 text-sky-400" />
          <div>
            <h3 className="text-sm font-bold text-white tracking-wide">
              Timeline Rotation & Operational Gantt
            </h3>
            <p className="text-xs text-slate-400">
              Visualizes physical aircraft turns and duty accumulation across the operating day
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('AIRCRAFT')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'AIRCRAFT'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Plane className="w-3.5 h-3.5" /> Aircraft Rotations ({aircraft.length})
          </button>
          <button
            onClick={() => setActiveTab('CREW')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              activeTab === 'CREW'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Crew Duty Limits ({crews.length})
          </button>
        </div>
      </div>

      {/* Gantt Container */}
      <div className="mt-4 overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Time axis header */}
          <div className="flex items-center mb-2 pl-28 pr-4 text-[10px] font-mono text-slate-500 relative h-6 border-b border-slate-800">
            {timeMarkers.map(m => (
              <div 
                key={m.mins}
                className="absolute -translate-x-1/2"
                style={{ left: `calc(7rem + (100% - 8rem) * ${(m.mins - startDayMinutes) / totalDaySpan})` }}
              >
                <span>{m.label}</span>
                <div className="w-[1px] h-2 bg-slate-700 mx-auto mt-0.5" />
              </div>
            ))}
          </div>

          {/* TAB 1: Aircraft Rotations */}
          {activeTab === 'AIRCRAFT' && (
            <div className="space-y-2 mt-3">
              {aircraft.map(ac => {
                const acFlights = flights.filter(f => f.tailNumber === ac.tailNumber);

                return (
                  <div key={ac.tailNumber} className="flex items-center group hover:bg-slate-800/40 p-1 rounded-lg transition-colors">
                    {/* Tail Number Label */}
                    <div className="w-28 flex-shrink-0 flex items-center gap-1.5">
                      <span className={`text-[11px] font-mono font-bold ${
                        ac.isSpare ? 'text-emerald-400' : 'text-slate-300'
                      }`}>
                        {ac.tailNumber}
                      </span>
                      {ac.isSpare ? (
                        <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-semibold uppercase">
                          SPARE
                        </span>
                      ) : (
                        <span className="text-[9px] text-slate-500 font-mono">
                          {ac.model.split('-')[0]}
                        </span>
                      )}
                    </div>

                    {/* Timeline Track */}
                    <div className="flex-1 h-7 bg-slate-950/80 rounded border border-slate-800/80 relative overflow-hidden">
                      {acFlights.map(flight => {
                        const leftPercent = getPercent(flight.etd);
                        const widthPercent = Math.max(1.5, getPercent(flight.eta) - leftPercent);
                        const isDelayed = flight.arrivalDelay > 0;
                        const isClosure = flight.delayRootCause === 'AIRPORT_CLOSURE_ORIGIN' || flight.delayRootCause === 'AIRPORT_GDP_DESTINATION';

                        return (
                          <div
                            key={flight.id}
                            className={`absolute top-0.5 bottom-0.5 rounded flex items-center justify-between px-1.5 text-[10px] font-mono cursor-pointer transition-all border ${
                              flight.status === 'CANCELLED'
                                ? 'bg-slate-800/60 border-slate-700 text-slate-500 line-through'
                                : isClosure
                                ? 'bg-rose-500/30 border-rose-500 text-rose-200'
                                : isDelayed
                                ? 'bg-amber-500/25 border-amber-500 text-amber-200'
                                : 'bg-sky-500/20 border-sky-500/40 text-sky-200'
                            }`}
                            style={{
                              left: `${leftPercent}%`,
                              width: `${widthPercent}%`
                            }}
                            title={`${flight.flightNumber}: ${flight.origin} -> ${flight.destination}\nSTD: ${formatMinutesToTime(flight.std)} | ETD: ${formatMinutesToTime(flight.etd)}\nSTA: ${formatMinutesToTime(flight.sta)} | ETA: ${formatMinutesToTime(flight.eta)}\nDelay: ${flight.arrivalDelay}m (${flight.delayRootCause})`}
                          >
                            <span className="truncate font-bold">
                              {flight.flightNumber}
                            </span>
                            <span className="text-[9px] opacity-75 truncate hidden sm:inline">
                              {flight.origin}→{flight.destination}
                            </span>
                            {isDelayed && (
                              <span className="text-[8px] bg-amber-500/40 text-amber-100 px-1 rounded ml-1 font-bold">
                                +{flight.arrivalDelay}m
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB 2: Crew Duty Tracker */}
          {activeTab === 'CREW' && (
            <div className="space-y-2 mt-3">
              {crews.map(crew => {
                const dutyStartPercent = getPercent(crew.dutyStartMinutes);
                const dutyEndPercent = getPercent(crew.actualDutyEndMinutes);
                const widthPercent = Math.max(2, dutyEndPercent - dutyStartPercent);
                const dutyHours = (crew.accumulatedDutyMinutes / 60).toFixed(1);

                return (
                  <div key={crew.id} className="flex items-center group hover:bg-slate-800/40 p-1 rounded-lg transition-colors">
                    {/* Crew Label */}
                    <div className="w-28 flex-shrink-0">
                      <div className="text-[11px] font-mono font-bold text-slate-300 truncate">
                        {crew.id}
                      </div>
                      <div className="text-[9px] text-slate-500 truncate">
                        {crew.homeBase} Base
                      </div>
                    </div>

                    {/* Duty Bar */}
                    <div className="flex-1 h-7 bg-slate-950/80 rounded border border-slate-800/80 relative overflow-hidden flex items-center">
                      <div
                        className={`absolute top-1 bottom-1 rounded px-2 flex items-center justify-between text-[10px] font-mono border ${
                          crew.isViolated
                            ? 'bg-rose-600/40 border-rose-500 text-rose-200 animate-pulse'
                            : crew.accumulatedDutyMinutes > 600
                            ? 'bg-amber-500/20 border-amber-500 text-amber-200'
                            : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                        }`}
                        style={{
                          left: `${dutyStartPercent}%`,
                          width: `${widthPercent}%`
                        }}
                        title={`${crew.name}\nDuty Start: ${formatMinutesToTime(crew.dutyStartMinutes)}\nDuty End: ${formatMinutesToTime(crew.actualDutyEndMinutes)}\nAccumulated Duty: ${dutyHours}h / 12h max`}
                      >
                        <span className="truncate font-semibold">
                          {crew.name.split('&')[0]} ({crew.assignedFlightIds.join(', ')})
                        </span>
                        <div className="flex items-center gap-1.5 ml-2">
                          <span className="font-bold text-[9px]">
                            {dutyHours}h duty
                          </span>
                          {crew.isViolated && (
                            <span className="px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold text-[8px] flex items-center gap-0.5">
                              <ShieldAlert className="w-2.5 h-2.5" /> ILLEGAL
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
