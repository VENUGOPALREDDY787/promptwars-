import React, { useState } from 'react';
import { SimulatedFlight } from '../types';
import { formatMinutesToTime } from '../engine/simulation';
import { Search, Filter, AlertTriangle, Clock, Plane, Wrench, CheckCircle } from 'lucide-react';

interface FlightTableProps {
  flights: SimulatedFlight[];
}

export const FlightTable: React.FC<FlightTableProps> = ({ flights }) => {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'DELAYED' | 'CASCADE' | 'CANCELLED' | 'ON_TIME'>('ALL');

  const filtered = flights.filter(f => {
    const matchesSearch = 
      f.flightNumber.toLowerCase().includes(search.toLowerCase()) ||
      f.origin.toLowerCase().includes(search.toLowerCase()) ||
      f.destination.toLowerCase().includes(search.toLowerCase()) ||
      f.tailNumber.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === 'DELAYED') return f.arrivalDelay > 0 && f.status !== 'CANCELLED';
    if (filter === 'CASCADE') return f.delayRootCause === 'AIRCRAFT_ROTATION';
    if (filter === 'CANCELLED') return f.status === 'CANCELLED';
    if (filter === 'ON_TIME') return f.status === 'ON_TIME';

    return true;
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-sky-400 rotate-45" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Master Flight Operations Manifest ({flights.length} Flights)
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Search box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search flight, route, tail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800 text-[11px]">
            <button
              onClick={() => setFilter('ALL')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filter === 'ALL' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({flights.length})
            </button>
            <button
              onClick={() => setFilter('DELAYED')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filter === 'DELAYED' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              Delayed ({flights.filter(f => f.arrivalDelay > 0 && f.status !== 'CANCELLED').length})
            </button>
            <button
              onClick={() => setFilter('CASCADE')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filter === 'CASCADE' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cascading ({flights.filter(f => f.delayRootCause === 'AIRCRAFT_ROTATION').length})
            </button>
            <button
              onClick={() => setFilter('CANCELLED')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filter === 'CANCELLED' ? 'bg-rose-500/20 text-rose-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cancelled ({flights.filter(f => f.status === 'CANCELLED').length})
            </button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto mt-3">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3">Flight</th>
              <th className="py-2.5 px-3">Route</th>
              <th className="py-2.5 px-3">Scheduled (STD/STA)</th>
              <th className="py-2.5 px-3">Simulated (ETD/ETA)</th>
              <th className="py-2.5 px-3">Delay</th>
              <th className="py-2.5 px-3">Root Cause</th>
              <th className="py-2.5 px-3">Aircraft Tail</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map(f => {
              const isClosureOrigin = f.delayRootCause === 'AIRPORT_CLOSURE_ORIGIN';
              const isClosureDest = f.delayRootCause === 'AIRPORT_GDP_DESTINATION';
              const isCascade = f.delayRootCause === 'AIRCRAFT_ROTATION';

              return (
                <tr key={f.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 font-bold text-white">
                    {f.flightNumber}
                  </td>
                  <td className="py-2 px-3">
                    <span className="font-semibold text-sky-400">{f.origin}</span>
                    <span className="text-slate-500 mx-1">→</span>
                    <span className="font-semibold text-sky-400">{f.destination}</span>
                  </td>
                  <td className="py-2 px-3 text-slate-400">
                    {formatMinutesToTime(f.std)} - {formatMinutesToTime(f.sta)}
                  </td>
                  <td className="py-2 px-3 font-semibold text-slate-200">
                    {formatMinutesToTime(f.etd)} - {formatMinutesToTime(f.eta)}
                  </td>
                  <td className="py-2 px-3 font-bold">
                    {f.status === 'CANCELLED' ? (
                      <span className="text-slate-500">—</span>
                    ) : f.arrivalDelay > 0 ? (
                      <span className="text-amber-400 font-bold">+{f.arrivalDelay}m</span>
                    ) : (
                      <span className="text-emerald-400 font-normal">0m</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {isClosureOrigin ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-semibold">
                        CLOSED ORIGIN
                      </span>
                    ) : isClosureDest ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-semibold">
                        GDP DESTINATION
                      </span>
                    ) : isCascade ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-semibold flex items-center gap-1 w-max">
                        <AlertTriangle className="w-2.5 h-2.5" /> AIRCRAFT ROTATION
                      </span>
                    ) : f.delayRootCause === 'CREW_TIMEOUT' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 font-semibold">
                        CREW TIMEOUT
                      </span>
                    ) : (
                      <span className="text-slate-500 text-[10px]">NOMINAL</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                      f.isRecovered ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'text-slate-400'
                    }`}>
                      {f.tailNumber}
                      {f.isRecovered && <Wrench className="w-2.5 h-2.5 inline ml-1" />}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    {f.status === 'CANCELLED' ? (
                      <span className="text-rose-400 font-bold text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10">
                        CANCELLED
                      </span>
                    ) : f.arrivalDelay > 0 ? (
                      <span className="text-amber-400 font-semibold text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10">
                        DELAYED
                      </span>
                    ) : (
                      <span className="text-emerald-400 text-[10px] flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" /> ON TIME
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
