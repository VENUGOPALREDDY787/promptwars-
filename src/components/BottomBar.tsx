import React, { useEffect } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Clock, 
  Users, 
  AlertOctagon, 
  ShieldAlert, 
  Ban, 
  MapPin,
  TrendingUp,
  FastForward
} from 'lucide-react';
import { minutesToTimeString, formatDuration } from '../data/dataLoader';

export const BottomBar: React.FC = () => {
  const {
    timeScrubberMinutes,
    setTimeScrubberMinutes,
    isPlaying,
    togglePlay,
    disruptedResult,
    recoveredResult,
    viewMode
  } = useSimulatorStore();

  const currentResult = viewMode === 'AFTER' ? recoveredResult : disruptedResult;
  const metrics = currentResult.metrics;

  // Auto-advance scrubber when playing
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setTimeScrubberMinutes((timeScrubberMinutes + 10) % 1440);
    }, 400);
    return () => clearInterval(interval);
  }, [isPlaying, timeScrubberMinutes, setTimeScrubberMinutes]);

  return (
    <footer className="h-[4.5rem] bg-[#0A0A0A] border-t border-[#222] px-4 flex flex-col justify-between py-1.5 select-none z-40">
      {/* 1. Time Scrubber Row */}
      <div className="flex items-center gap-3">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="p-1 rounded bg-[#1A1A1A] hover:bg-[#252525] border border-[#333] text-cyan-400 hover:text-white transition-colors"
          title={isPlaying ? 'Pause Cascade Replay' : 'Play Cascade Replay'}
        >
          {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
        </button>

        {/* Current Time Display */}
        <div className="flex items-center gap-1 font-mono text-xs font-bold text-white w-20">
          <Clock className="w-3 h-3 text-cyan-400" />
          <span>{minutesToTimeString(timeScrubberMinutes)}</span>
        </div>

        {/* Scrubber Range Slider (00:00 to 24:00 -> 0 to 1440 mins) */}
        <div className="flex-1 relative flex items-center">
          <input
            type="range"
            min={0}
            max={1440}
            step={5}
            value={timeScrubberMinutes}
            onChange={(e) => setTimeScrubberMinutes(Number(e.target.value))}
            className="w-full h-1.5 accent-cyan-500 bg-[#1A1A1A] rounded-lg cursor-pointer"
          />
        </div>

        <button
          onClick={() => setTimeScrubberMinutes(360)} // reset to 06:00
          className="p-1 rounded hover:bg-[#1A1A1A] text-slate-500 hover:text-slate-300 transition-colors"
          title="Reset to 06:00"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>

      {/* 2. KPI Strip Row */}
      <div className="grid grid-cols-7 gap-2 pt-1 border-t border-[#181818] text-xs font-mono">
        {/* KPI 1: Flights Delayed */}
        <div className="flex items-center justify-between px-2 py-0.5 rounded bg-[#111] border border-[#1C1C1C]">
          <span className="text-[10px] text-slate-400">Delayed Flights:</span>
          <span className={`font-bold ${metrics.flightsDelayed > 0 ? 'text-amber-400' : 'text-slate-200'}`}>
            {metrics.flightsDelayed}
          </span>
        </div>

        {/* KPI 2: Flights Cancelled */}
        <div className="flex items-center justify-between px-2 py-0.5 rounded bg-[#111] border border-[#1C1C1C]">
          <span className="text-[10px] text-slate-400">Cancelled:</span>
          <span className={`font-bold ${metrics.flightsCancelled > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
            {metrics.flightsCancelled}
          </span>
        </div>

        {/* KPI 3: Total Delay Minutes */}
        <div className="flex items-center justify-between px-2 py-0.5 rounded bg-[#111] border border-[#1C1C1C]">
          <span className="text-[10px] text-slate-400">Total Delay:</span>
          <span className={`font-bold ${metrics.totalDelayMinutes > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
            {metrics.totalDelayMinutes}m
          </span>
        </div>

        {/* KPI 4: Passengers Stranded */}
        <div className="flex items-center justify-between px-2 py-0.5 rounded bg-[#111] border border-[#1C1C1C]">
          <span className="text-[10px] text-slate-400">Pax Stranded:</span>
          <span className={`font-bold ${metrics.passengersStranded > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
            {metrics.passengersStranded}
          </span>
        </div>

        {/* KPI 5: Missed Connections */}
        <div className="flex items-center justify-between px-2 py-0.5 rounded bg-[#111] border border-[#1C1C1C]">
          <span className="text-[10px] text-slate-400">Missed MCT:</span>
          <span className={`font-bold ${metrics.missedConnectionsCount > 0 ? 'text-rose-400' : 'text-slate-200'}`}>
            {metrics.missedConnectionsCount}
          </span>
        </div>

        {/* KPI 6: Crews Over Duty Limit */}
        <div className="flex items-center justify-between px-2 py-0.5 rounded bg-[#111] border border-[#1C1C1C]">
          <span className="text-[10px] text-slate-400">Crew Breaches:</span>
          <span className={`font-bold ${metrics.crewsOverDutyLimit > 0 ? 'text-rose-500 animate-pulse' : 'text-emerald-400'}`}>
            {metrics.crewsOverDutyLimit}
          </span>
        </div>

        {/* KPI 7: Airports Affected */}
        <div className="flex items-center justify-between px-2 py-0.5 rounded bg-[#111] border border-[#1C1C1C]">
          <span className="text-[10px] text-slate-400">Airports Affected:</span>
          <span className="font-bold text-cyan-400">
            {metrics.airportsAffected} / 16
          </span>
        </div>
      </div>
    </footer>
  );
};
