import React from 'react';
import { Airport, AirportClosure } from '../types';
import { formatMinutesToTime, formatDuration } from '../engine/simulation';
import { AlertTriangle, Clock, RefreshCw, Zap, ShieldAlert } from 'lucide-react';

interface ControlPanelProps {
  airports: Airport[];
  closure: AirportClosure | null;
  onApplyClosure: (closure: AirportClosure | null) => void;
  onReset: () => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  airports,
  closure,
  onApplyClosure,
  onReset
}) => {
  const selectedAirportCode = closure ? closure.airportCode : 'ORD';
  const startMinutes = closure ? closure.startMinutes : 600; // 10:00 AM
  const durationMinutes = closure ? closure.durationMinutes : 180; // 3 hours

  const handleAirportChange = (code: string) => {
    onApplyClosure({
      airportCode: code,
      startMinutes,
      endMinutes: startMinutes + durationMinutes,
      durationMinutes
    });
  };

  const handleStartChange = (val: number) => {
    onApplyClosure({
      airportCode: selectedAirportCode,
      startMinutes: val,
      endMinutes: val + durationMinutes,
      durationMinutes
    });
  };

  const handleDurationChange = (val: number) => {
    onApplyClosure({
      airportCode: selectedAirportCode,
      startMinutes,
      endMinutes: startMinutes + val,
      durationMinutes: val
    });
  };

  const handleQuickScenario = (code: string, start: number, duration: number) => {
    onApplyClosure({
      airportCode: code,
      startMinutes: start,
      endMinutes: start + duration,
      durationMinutes: duration
    });
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h2 className="text-base font-bold text-white tracking-wide">
              Airport Disruption Control Room
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a target airport and duration to trigger real-time cascading rotational delays
          </p>
        </div>

        {/* Quick Presets */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 font-medium">Quick Scenarios:</span>
          <button
            onClick={() => handleQuickScenario('ORD', 600, 180)}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 transition-colors flex items-center gap-1"
          >
            <Zap className="w-3 h-3 text-sky-400" /> ORD Hub Squall (3h)
          </button>
          <button
            onClick={() => handleQuickScenario('DFW', 660, 150)}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 transition-colors flex items-center gap-1"
          >
            <Zap className="w-3 h-3 text-amber-400" /> DFW Supercell (2.5h)
          </button>
          <button
            onClick={() => handleQuickScenario('DEN', 540, 120)}
            className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-indigo-300 border border-slate-700 transition-colors flex items-center gap-1"
          >
            <Zap className="w-3 h-3 text-indigo-400" /> DEN Blizzard (2h)
          </button>
          <button
            onClick={onReset}
            className="px-2.5 py-1 rounded-md bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 transition-colors flex items-center gap-1 ml-1"
          >
            <RefreshCw className="w-3 h-3" /> Clear Disruption
          </button>
        </div>
      </div>

      {/* Disruption Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-5">
        {/* 1. Airport Selector */}
        <div>
          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
            Target Airport ({airports.length} Stations)
          </label>
          <select
            value={closure ? closure.airportCode : ''}
            onChange={(e) => {
              if (e.target.value === '') {
                onReset();
              } else {
                handleAirportChange(e.target.value);
              }
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
          >
            <option value="">-- No Airport Closed (Nominal) --</option>
            {airports.map(apt => (
              <option key={apt.code} value={apt.code}>
                {apt.code} — {apt.name} ({apt.city}) {apt.hub ? '★ HUB' : ''}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 mt-1.5">
            Closing a major hub (ORD, DFW, DEN, ATL) produces the strongest rotational wave.
          </p>
        </div>

        {/* 2. Closure Start Time Slider */}
        <div className={closure ? 'opacity-100' : 'opacity-40 pointer-events-none'}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              Closure Start Time
            </label>
            <span className="font-mono text-sm font-bold text-sky-400">
              {formatMinutesToTime(startMinutes)}
            </span>
          </div>
          <input
            type="range"
            min={360}  // 06:00
            max={1080} // 18:00
            step={30}  // 30 min increments
            value={startMinutes}
            onChange={(e) => handleStartChange(Number(e.target.value))}
            className="w-full accent-sky-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>06:00 AM</span>
            <span>12:00 PM</span>
            <span>06:00 PM</span>
          </div>
        </div>

        {/* 3. Duration Slider */}
        <div className={closure ? 'opacity-100' : 'opacity-40 pointer-events-none'}>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              Closure Duration
            </label>
            <span className="font-mono text-sm font-bold text-amber-400">
              {formatDuration(durationMinutes)} ({durationMinutes} mins)
            </span>
          </div>
          <input
            type="range"
            min={30}
            max={360}
            step={30}
            value={durationMinutes}
            onChange={(e) => handleDurationChange(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1 font-mono">
            <span>30m</span>
            <span>3h</span>
            <span>6h</span>
          </div>
        </div>
      </div>
    </div>
  );
};
