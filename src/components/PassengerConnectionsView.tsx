import React, { useState } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { minutesToTimeString, formatDuration } from '../data/dataLoader';
import { Users, Clock, AlertTriangle, CheckCircle2, ShieldAlert, ArrowRight, Filter, Search } from 'lucide-react';

export const PassengerConnectionsView: React.FC = () => {
  const { disruptedResult, recoveredResult, viewMode, setSelectedFlightId, applyRecoveryAction } = useSimulatorStore();
  const [filter, setFilter] = useState<'ALL' | 'MISSED' | 'CONNECTED'>('ALL');
  const [search, setSearch] = useState('');

  const currentResult = viewMode === 'AFTER' ? recoveredResult : disruptedResult;
  const connections = currentResult.connections;
  const flights = currentResult.flights;

  const filtered = connections.filter(c => {
    if (filter === 'MISSED' && c.status !== 'MISSED') return false;
    if (filter === 'CONNECTED' && c.status !== 'CONNECTED') return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        c.connection_id.toLowerCase().includes(q) ||
        c.airport.toLowerCase().includes(q) ||
        c.from_flight.toLowerCase().includes(q) ||
        c.to_flight.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const missedCount = connections.filter(c => c.status === 'MISSED').length;
  const strandedPaxCount = connections
    .filter(c => c.status === 'MISSED')
    .reduce((sum, c) => sum + c.passengers, 0);

  return (
    <div className="flex-1 flex flex-col bg-[#0A0A0A] text-slate-100 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-[#1F1F1F] bg-[#111] flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-base font-semibold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            Passenger Connection & Stranding Matrix (21 Tracked Itineraries)
          </h2>
          <p className="text-xs text-slate-400">
            Real-time Minimum Connect Time (MCT 45m) slack analysis and stranded passenger calculation.
          </p>
        </div>

        {/* Quick Stats Badges */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 rounded-lg bg-[#181818] border border-[#262626] flex items-center gap-2">
            <span className="text-xs text-slate-400">Total Connections:</span>
            <span className="font-mono text-xs font-bold text-white">{connections.length}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center gap-2">
            <span className="text-xs text-rose-300">Missed Connections:</span>
            <span className="font-mono text-xs font-bold text-rose-400">{missedCount}</span>
          </div>
          <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center gap-2">
            <span className="text-xs text-amber-300">Stranded Pax:</span>
            <span className="font-mono text-xs font-bold text-amber-400">{strandedPaxCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-6 py-3 border-b border-[#1F1F1F] bg-[#0E0E0E] flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search by Connection ID, Airport (BOM, DEL), or Flight ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#141414] border border-[#282828] rounded text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filter === 'ALL' ? 'bg-[#222] text-white border border-[#333]' : 'text-slate-400 hover:text-white'
            }`}
          >
            All (21)
          </button>
          <button
            onClick={() => setFilter('MISSED')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filter === 'MISSED' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Broken / Missed ({missedCount})
          </button>
          <button
            onClick={() => setFilter('CONNECTED')}
            className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
              filter === 'CONNECTED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Secured ({connections.length - missedCount})
          </button>
        </div>
      </div>

      {/* Connection Itineraries Table */}
      <div className="flex-1 overflow-auto p-6">
        <div className="border border-[#1F1F1F] rounded-lg bg-[#111] overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#161616] border-b border-[#222] text-slate-400 uppercase text-[10px] font-mono tracking-wider">
              <tr>
                <th className="py-3 px-4">Connection ID</th>
                <th className="py-3 px-4">Transfer Hub</th>
                <th className="py-3 px-4">Inbound Flight</th>
                <th className="py-3 px-4">Outbound Flight</th>
                <th className="py-3 px-4">Passengers</th>
                <th className="py-3 px-4">MCT Required</th>
                <th className="py-3 px-4">Actual Slack</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1A1A1A]">
              {filtered.map(cx => {
                const inFlight = flights.find(f => f.flight_id === cx.from_flight);
                const outFlight = flights.find(f => f.flight_id === cx.to_flight);
                const isBroken = cx.status === 'MISSED';

                return (
                  <tr key={cx.connection_id} className="hover:bg-[#151515] transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      {cx.connection_id}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 font-mono text-[11px] font-bold">
                        {cx.airport}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedFlightId(cx.from_flight)}
                        className="font-mono text-cyan-400 hover:underline flex items-center gap-1"
                      >
                        {cx.from_flight}
                        <span className="text-[10px] text-slate-500">
                          (Arr: {minutesToTimeString(cx.fromFlightActualArr)})
                        </span>
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => setSelectedFlightId(cx.to_flight)}
                        className="font-mono text-indigo-400 hover:underline flex items-center gap-1"
                      >
                        {cx.to_flight}
                        <span className="text-[10px] text-slate-500">
                          (Dep: {minutesToTimeString(cx.toFlightActualDep)})
                        </span>
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-white">
                      {cx.passengers} pax
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {cx.min_connect_minutes}m
                    </td>
                    <td className="py-3 px-4 font-mono">
                      {cx.slackMinutes >= 0 ? (
                        <span className="text-emerald-400 font-semibold">+{cx.slackMinutes}m slack</span>
                      ) : (
                        <span className="text-rose-400 font-bold">{cx.slackMinutes}m deficit</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {isBroken ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-bold flex items-center gap-1 w-max">
                          <AlertTriangle className="w-3 h-3" /> MISSED ({cx.passengers} Stranded)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 w-max">
                          <CheckCircle2 className="w-3 h-3" /> SECURED
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isBroken && Math.abs(cx.slackMinutes) <= 20 && (
                        <button
                          onClick={() => {
                            applyRecoveryAction({
                              id: `HOLD-${cx.connection_id}`,
                              type: 'HOLD_CONNECTION',
                              title: `Hold ${cx.to_flight} for ${cx.connection_id}`,
                              description: `Holds departure of ${cx.to_flight} by ${Math.abs(cx.slackMinutes) + 5}m to protect ${cx.passengers} connecting passengers.`,
                              holdConnectionId: cx.connection_id,
                              holdExtraMinutes: Math.abs(cx.slackMinutes) + 5,
                              targetFlightId: cx.to_flight
                            });
                          }}
                          className="px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[10px] font-semibold transition-colors"
                        >
                          Hold Connection (+{Math.abs(cx.slackMinutes) + 5}m)
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
