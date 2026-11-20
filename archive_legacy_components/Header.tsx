import React from 'react';
import { Plane, Radio, ShieldCheck, Activity } from 'lucide-react';

interface HeaderProps {
  activeClosureCount: number;
  totalDelayMinutes: number;
}

export const Header: React.FC<HeaderProps> = ({ activeClosureCount, totalDelayMinutes }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50 px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white shadow-lg shadow-sky-500/20">
            <Plane className="w-6 h-6 rotate-45" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2 font-mono">
                DOMINO SKY
              </h1>
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Disruption Simulator
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Deterministic Cascade Engine • Rotations • Passenger MCT • Crew Duty
            </p>
          </div>
        </div>

        {/* Live Network Health Status */}
        <div className="flex items-center gap-6 text-xs">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
            <Radio className={`w-4 h-4 ${activeClosureCount > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'}`} />
            <span className="text-slate-400">Network State:</span>
            <span className={`font-semibold ${activeClosureCount > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {activeClosureCount > 0 ? `${activeClosureCount} Airport Disrupted` : 'All Stations Nominal'}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700">
            <Activity className="w-4 h-4 text-sky-400" />
            <span className="text-slate-400">Cascade Status:</span>
            <span className="font-mono font-medium text-slate-200">
              {totalDelayMinutes > 0 ? `${totalDelayMinutes.toLocaleString()} delay mins active` : '0 min ripple'}
            </span>
          </div>

          <div className="hidden md:flex items-center gap-1.5 text-slate-400 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-sky-400" />
            <span>Deterministic Verified</span>
          </div>
        </div>
      </div>
    </header>
  );
};
