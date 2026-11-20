import React, { useState, useMemo } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { SimulatedFlight, FlightStatus, DelayRootCause } from '../types';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  Ban, 
  Sparkles, 
  ChevronRight,
  Plane
} from 'lucide-react';

export const LeftPaneFlightList: React.FC = () => {
  const { 
    disruptedResult, 
    recoveredResult, 
    viewMode, 
    selectedFlightId, 
    setSelectedFlightId, 
    dataset 
  } = useSimulatorStore();

  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [airportFilter, setAirportFilter] = useState<string>('ALL');
  const [tailFilter, setTailFilter] = useState<string>('ALL');
  const [causeFilter, setCauseFilter] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'DEP_TIME' | 'DELAY' | 'PAX'>('DEP_TIME');

  const currentResult = viewMode === 'AFTER' ? recoveredResult : disruptedResult;
  const flights = currentResult.flights;

  // Build map of improved flights (flights where delay was reduced in recoveredResult)
  const improvedFlightIds = useMemo(() => {
    const set = new Set<string>();
    recoveredResult.flights.forEach(rFlight => {
      const dFlight = disruptedResult.flights.find(df => df.flight_id === rFlight.flight_id);
      if (dFlight && rFlight.arrivalDelay < dFlight.arrivalDelay) {
        set.add(rFlight.flight_id);
      }
    });
    return set;
  }, [disruptedResult, recoveredResult]);

  // Filtering & Sorting
  const filteredFlights = useMemo(() => {
    return flights.filter(f => {
      // Search
      const q = search.toLowerCase();
      const matchSearch = 
        f.flight_id.toLowerCase().includes(q) ||
        f.origin.toLowerCase().includes(q) ||
        f.destination.toLowerCase().includes(q) ||
        f.tail_id.toLowerCase().includes(q);

      if (!matchSearch) return false;

      // Status Filter
      if (statusFilter !== 'ALL') {
        if (statusFilter === 'DELAYED' && (f.arrivalDelay === 0 || f.status === 'CANCELLED')) return false;
        if (statusFilter === 'ON_TIME' && (f.arrivalDelay > 0 || f.status !== 'ON_TIME')) return false;
        if (statusFilter === 'CANCELLED' && f.status !== 'CANCELLED') return false;
        if (statusFilter === 'RECOVERED' && !improvedFlightIds.has(f.flight_id)) return false;
      }

      // Airport Filter
      if (airportFilter !== 'ALL') {
        if (f.origin !== airportFilter && f.destination !== airportFilter) return false;
      }

      // Tail Filter
      if (tailFilter !== 'ALL' && f.tail_id !== tailFilter) return false;

      // Cause Filter
      if (causeFilter !== 'ALL' && f.delayRootCause !== causeFilter) return false;

      return true;
    }).sort((a, b) => {
      if (sortBy === 'DELAY') return b.arrivalDelay - a.arrivalDelay;
      if (sortBy === 'PAX') return (b.passengersAffected || b.pax) - (a.passengersAffected || a.pax);
      return a.stdMinutes - b.stdMinutes;
    });
  }, [flights, search, statusFilter, airportFilter, tailFilter, causeFilter, sortBy, improvedFlightIds]);

  return (
    <div className="w-80 flex-shrink-0 bg-[#0A0A0A] border-r border-[#222] flex flex-col h-[calc(100vh-3.5rem-4.5rem)] select-none">
      {/* Search & Filter Header */}
      <div className="p-3 border-b border-[#222] space-y-2 bg-[#0A0A0A]">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search flight, route, tail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#141414] border border-[#222] focus:border-cyan-500 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`p-1.5 rounded-lg border transition-colors ${
              showFilters || statusFilter !== 'ALL' || airportFilter !== 'ALL'
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400'
                : 'bg-[#141414] border-[#222] text-slate-400 hover:text-white'
            }`}
            title="Toggle Filters"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Expandable Filter Drawer */}
        {showFilters && (
          <div className="p-2.5 bg-[#141414] border border-[#222] rounded-xl text-xs space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase">
              <span>Filter Options</span>
              <button 
                onClick={() => {
                  setStatusFilter('ALL');
                  setAirportFilter('ALL');
                  setTailFilter('ALL');
                  setCauseFilter('ALL');
                }}
                className="text-cyan-400 hover:underline"
              >
                Reset
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div>
                <label className="text-slate-500 block mb-0.5">Status:</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#333] rounded px-1.5 py-1 text-slate-200"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="ON_TIME">On Time</option>
                  <option value="CANCELLED">Cancelled</option>
                  <option value="RECOVERED">Recovered</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-0.5">Airport:</label>
                <select
                  value={airportFilter}
                  onChange={(e) => setAirportFilter(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#333] rounded px-1.5 py-1 text-slate-200"
                >
                  <option value="ALL">All Airports</option>
                  {dataset.airports.map(a => (
                    <option key={a.id} value={a.id}>{a.id} - {a.city}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-0.5">Sort By:</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full bg-[#0A0A0A] border border-[#333] rounded px-1.5 py-1 text-slate-200"
                >
                  <option value="DEP_TIME">Departure Time</option>
                  <option value="DELAY">Highest Delay</option>
                  <option value="PAX">Passengers</option>
                </select>
              </div>

              <div>
                <label className="text-slate-500 block mb-0.5">Delay Cause:</label>
                <select
                  value={causeFilter}
                  onChange={(e) => setCauseFilter(e.target.value)}
                  className="w-full bg-[#0A0A0A] border border-[#333] rounded px-1.5 py-1 text-slate-200"
                >
                  <option value="ALL">All Causes</option>
                  <option value="ROOT_CLOSURE">Root Closure</option>
                  <option value="AIRCRAFT_ROTATION">Rotation Cascade</option>
                  <option value="CREW_DUTY">Crew Duty</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Counts summary */}
        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
          <span>{filteredFlights.length} of 70 Flights</span>
          <span className="text-amber-400 font-semibold">
            {flights.filter(f => f.arrivalDelay > 0 && f.status !== 'CANCELLED').length} Delayed
          </span>
        </div>
      </div>

      {/* Flight Cards Scrollable List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#191919]">
        {filteredFlights.map(flight => {
          const isSelected = flight.flight_id === selectedFlightId;
          const isImproved = improvedFlightIds.has(flight.flight_id);
          const isDelayed = flight.arrivalDelay > 0 && flight.status !== 'CANCELLED';
          const isCancelled = flight.status === 'CANCELLED';

          return (
            <div
              key={flight.flight_id}
              onClick={() => setSelectedFlightId(flight.flight_id)}
              className={`p-3 cursor-pointer transition-all border-l-2 ${
                isSelected
                  ? 'bg-[#181818] border-cyan-400'
                  : 'hover:bg-[#121212] border-transparent'
              }`}
            >
              {/* Top Row: Flight ID, Route, Status Chip */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono font-bold text-xs text-white">
                    {flight.flight_id}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 font-medium">
                    {flight.origin}→{flight.destination}
                  </span>
                </div>

                {/* Status Chip */}
                {isCancelled ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    CANCELLED
                  </span>
                ) : isImproved ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-0.5">
                    <Sparkles className="w-2.5 h-2.5" /> RECOVERED
                  </span>
                ) : isDelayed ? (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    DELAYED
                  </span>
                ) : (
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    ON TIME
                  </span>
                )}
              </div>

              {/* Middle Row: Times & Delay Badge */}
              <div className="flex items-center justify-between text-xs font-mono">
                <div className="text-slate-400 text-[11px]">
                  <span>{flight.dep}</span>
                  <span className="text-slate-600 mx-1">-</span>
                  <span>{flight.arr}</span>
                </div>

                {isCancelled ? (
                  <span className="text-rose-400 text-[11px] font-bold">
                    Grounded
                  </span>
                ) : isDelayed ? (
                  <span className="text-amber-400 font-bold text-[11px] flex items-center gap-0.5">
                    +{flight.arrivalDelay}m
                  </span>
                ) : (
                  <span className="text-emerald-400 text-[11px]">
                    0m
                  </span>
                )}
              </div>

              {/* Bottom Row: Tail ID & Cause */}
              <div className="flex items-center justify-between mt-1 text-[10px] text-slate-500 font-mono">
                <span>{flight.assignedTailId} (Leg {flight.leg_order})</span>
                {flight.delayRootCause === 'AIRCRAFT_ROTATION' && (
                  <span className="text-amber-400/90 font-medium">Rotation</span>
                )}
                {flight.delayRootCause === 'ROOT_CLOSURE' && (
                  <span className="text-rose-400/90 font-medium">Closure</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
