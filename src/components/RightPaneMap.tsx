import React, { useState, useMemo } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { Airport, SimulatedFlight } from '../types';
import { 
  Plane, 
  AlertTriangle, 
  Plus, 
  Minus, 
  Maximize2, 
  Layers, 
  Sparkles,
  ShieldAlert,
  Flame,
  GitBranch
} from 'lucide-react';
import { minutesToTimeString } from '../data/dataLoader';

// Indian Subcontinent Geospatial Projection
// Lat: ~7.5 to ~32.5 (South to North)
// Lng: ~68.0 to ~93.5 (West to East)
function projectIndia(lat: number, lng: number, width: number, height: number): [number, number] {
  const minLat = 7.0;
  const maxLat = 32.5;
  const minLng = 68.0;
  const maxLng = 93.5;

  const x = ((lng - minLng) / (maxLng - minLng)) * (width - 140) + 70;
  // Invert y since SVG (0,0) is top-left
  const y = height - (((lat - minLat) / (maxLat - minLat)) * (height - 100) + 50);
  return [x, y];
}

export const RightPaneMap: React.FC = () => {
  const { 
    dataset, 
    disruptedResult, 
    recoveredResult, 
    viewMode, 
    setViewMode, 
    selectedFlightId, 
    setSelectedFlightId, 
    scenario, 
    setScenario,
    timeScrubberMinutes,
    mapLayer,
    setMapLayer 
  } = useSimulatorStore();

  const [zoom, setZoom] = useState(1);
  const [hoveredAirport, setHoveredAirport] = useState<Airport | null>(null);

  const width = 860;
  const height = 640;

  const currentResult = viewMode === 'AFTER' ? recoveredResult : disruptedResult;
  const flights = currentResult.flights;

  // Build coordinate lookup
  const coordsMap = useMemo(() => {
    const map = new Map<string, [number, number]>();
    dataset.airports.forEach(a => {
      map.set(a.id, projectIndia(a.lat, a.lng, width, height));
    });
    return map;
  }, [dataset.airports]);

  // Calculate cluster badge counts per airport (active inbounds/outbounds at this station)
  const airportClusters = useMemo(() => {
    const map = new Map<string, { total: number; delayed: number }>();
    dataset.airports.forEach(a => map.set(a.id, { total: 0, delayed: 0 }));

    flights.forEach(f => {
      const orig = map.get(f.origin);
      if (orig) {
        orig.total++;
        if (f.arrivalDelay > 0) orig.delayed++;
      }
    });
    return map;
  }, [dataset.airports, flights]);

  return (
    <div className="flex-1 bg-[#0A0A0A] flex flex-col h-[calc(100vh-3.5rem-4.5rem)] relative overflow-hidden select-none">
      {/* Top Map Toolbar: Layer Toggles & Before/After Slider */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none">
        {/* Layer Toggles */}
        <div className="pointer-events-auto flex items-center gap-1 bg-[#141414]/90 backdrop-blur-md p-1 rounded-xl border border-[#262626] text-xs">
          <button
            onClick={() => setMapLayer('CHAINS')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              mapLayer === 'CHAINS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" /> Aircraft Chains
          </button>
          <button
            onClick={() => setMapLayer('HEATMAP')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              mapLayer === 'HEATMAP'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" /> Delay Heatmap
          </button>
          <button
            onClick={() => setMapLayer('CREW_RISK')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
              mapLayer === 'CREW_RISK'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" /> Crew Risk
          </button>
        </div>

        {/* Before / After Toggle Switch */}
        <div className="pointer-events-auto flex items-center gap-2 bg-[#141414]/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-[#262626] text-xs">
          <span className="text-slate-400 font-mono text-[11px]">View State:</span>
          <div className="flex items-center gap-1 bg-[#0A0A0A] p-0.5 rounded-lg border border-[#222]">
            <button
              onClick={() => setViewMode('BEFORE')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all ${
                viewMode === 'BEFORE'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              Before (Disrupted)
            </button>
            <button
              onClick={() => setViewMode('AFTER')}
              className={`px-2.5 py-1 rounded text-[11px] font-bold transition-all flex items-center gap-1 ${
                viewMode === 'AFTER'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Sparkles className="w-2.5 h-2.5" /> After (AI Recovered)
            </button>
          </div>
        </div>
      </div>

      {/* Floating Zoom Controls (Bottom-Right) */}
      <div className="absolute bottom-6 right-6 z-20 flex flex-col gap-1.5 bg-[#141414]/90 backdrop-blur-md p-1.5 rounded-xl border border-[#262626]">
        <button
          onClick={() => setZoom(prev => Math.min(2.0, prev + 0.15))}
          className="p-1.5 rounded hover:bg-[#222] text-slate-400 hover:text-white transition-colors"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(0.7, prev - 0.15))}
          className="p-1.5 rounded hover:bg-[#222] text-slate-400 hover:text-white transition-colors"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(1)}
          className="p-1.5 rounded hover:bg-[#222] text-slate-400 hover:text-white transition-colors"
          title="Reset View"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main SVG Airspace Canvas */}
      <div className="flex-1 w-full h-full relative flex items-center justify-center overflow-hidden">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full max-w-full max-h-full transition-transform duration-200 select-none"
          style={{ transform: `scale(${zoom})` }}
        >
          <defs>
            {/* Pulsing ring for closed airport */}
            <radialGradient id="closedBeacon" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.7" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            {/* Radar concentric circular grid */}
            <pattern id="airspaceGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#171717" strokeWidth="0.6" />
            </pattern>
          </defs>

          {/* Background grid */}
          <rect width={width} height={height} fill="url(#airspaceGrid)" />

          {/* Subtle coastline/regional boundary aesthetic contour lines */}
          <ellipse cx={width * 0.48} cy={height * 0.52} rx={270} ry={250} fill="none" stroke="#151515" strokeWidth="1" strokeDasharray="4,4" />
          <ellipse cx={width * 0.48} cy={height * 0.52} rx={180} ry={160} fill="none" stroke="#1a1a1a" strokeWidth="1" />

          {/* 1. Draw Flight Route Arcs */}
          {flights.map(flight => {
            const originCoord = coordsMap.get(flight.origin);
            const destCoord = coordsMap.get(flight.destination);
            if (!originCoord || !destCoord) return null;

            const [x1, y1] = originCoord;
            const [x2, y2] = destCoord;

            const isSelected = flight.flight_id === selectedFlightId;
            const isDelayed = flight.arrivalDelay > 0 && flight.status !== 'CANCELLED';
            const isCancelled = flight.status === 'CANCELLED';
            const isClosureFlight = scenario && (flight.origin === scenario.airportCode || flight.destination === scenario.airportCode);

            // Arc curve midpoint calculation
            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const bend = dist * 0.14;
            const cx = (x1 + x2) / 2 - (dy / dist) * bend;
            const cy = (y1 + y2) / 2 + (dx / dist) * bend;

            const pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

            let strokeColor = '#06b6d4'; // teal / cyan accent
            let strokeWidth = isSelected ? 2.5 : 1.2;
            let strokeOpacity = isSelected ? 1 : 0.35;
            let dashArray = '';

            if (isCancelled) {
              strokeColor = '#f43f5e';
              strokeOpacity = 0.2;
              dashArray = '3,3';
            } else if (mapLayer === 'HEATMAP') {
              if (flight.arrivalDelay >= 60) strokeColor = '#ef4444';
              else if (flight.arrivalDelay > 0) strokeColor = '#f59e0b';
              else strokeColor = '#10b981';
              strokeOpacity = isDelayed ? 0.8 : 0.25;
            } else if (isClosureFlight) {
              strokeColor = '#f43f5e';
              strokeOpacity = 0.8;
              strokeWidth = 2.0;
            } else if (isDelayed) {
              strokeColor = '#f59e0b';
              strokeOpacity = 0.7;
              strokeWidth = 1.8;
            }

            // Animated airplane icon along flight path if active at timeScrubberMinutes
            const isActiveInAir = timeScrubberMinutes >= flight.actualDepMinutes && timeScrubberMinutes <= flight.actualArrMinutes;
            const progress = isActiveInAir 
              ? (timeScrubberMinutes - flight.actualDepMinutes) / Math.max(1, flight.actualArrMinutes - flight.actualDepMinutes) 
              : 0;

            // Quadratic bezier position for plane
            const planeX = (1 - progress) * (1 - progress) * x1 + 2 * (1 - progress) * progress * cx + progress * progress * x2;
            const planeY = (1 - progress) * (1 - progress) * y1 + 2 * (1 - progress) * progress * cy + progress * progress * y2;

            return (
              <g key={flight.flight_id}>
                {/* Arc line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                  strokeDasharray={dashArray}
                  className="cursor-pointer hover:stroke-cyan-300 hover:stroke-opacity-100 transition-all"
                  onClick={() => setSelectedFlightId(flight.flight_id)}
                />

                {/* Animated aircraft in transit */}
                {isActiveInAir && (
                  <g transform={`translate(${planeX}, ${planeY})`}>
                    <circle r="4" fill="#06b6d4" className="animate-ping" opacity="0.6" />
                    <circle r="3" fill="#ffffff" />
                  </g>
                )}
              </g>
            );
          })}

          {/* 2. Closed Airport Pulsing Warning Radar Beacon */}
          {scenario && coordsMap.get(scenario.airportCode) && (
            <g>
              {(() => {
                const [cx, cy] = coordsMap.get(scenario.airportCode)!;
                return (
                  <>
                    <circle cx={cx} cy={cy} r="45" fill="url(#closedBeacon)" className="animate-pulse" />
                    <circle cx={cx} cy={cy} r="28" fill="none" stroke="#ef4444" strokeWidth="1.5">
                      <animate attributeName="r" values="10;45" dur="2s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.9;0" dur="2s" repeatCount="indefinite" />
                    </circle>
                  </>
                );
              })()}
            </g>
          )}

          {/* 3. Draw All 16 Airport Nodes */}
          {dataset.airports.map(apt => {
            const coord = coordsMap.get(apt.id);
            if (!coord) return null;
            const [x, y] = coord;

            const isClosed = scenario && scenario.airportCode === apt.id;
            const cluster = airportClusters.get(apt.id) || { total: 0, delayed: 0 };
            const isMegaHub = apt.tier === 'mega_hub';
            const radius = isMegaHub ? 8.5 : 6;

            return (
              <g
                key={apt.id}
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredAirport(apt)}
                onMouseLeave={() => setHoveredAirport(null)}
                onClick={() => {
                  setScenario({
                    airportCode: apt.id,
                    closeStartMinutes: 540,
                    closeEndMinutes: 630,
                    durationMinutes: 90
                  });
                }}
              >
                {/* Node Outer Ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={radius + 4}
                  fill="none"
                  stroke={isClosed ? '#ef4444' : cluster.delayed > 0 ? '#f59e0b' : '#06b6d4'}
                  strokeWidth="1.5"
                  strokeOpacity={isClosed ? 1 : 0.4}
                  className="group-hover:stroke-opacity-100 transition-all"
                />

                {/* Node Center Dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={radius}
                  fill={isClosed ? '#ef4444' : cluster.delayed > 0 ? '#f59e0b' : '#0284c7'}
                  className="transition-colors"
                />

                {/* Airport Code Label */}
                <text
                  x={x}
                  y={y - radius - 5}
                  textAnchor="middle"
                  className={`text-[10px] font-mono font-bold tracking-wider select-none ${
                    isClosed
                      ? 'fill-rose-400'
                      : cluster.delayed > 0
                      ? 'fill-amber-300'
                      : 'fill-slate-300'
                  }`}
                >
                  {apt.id}
                </text>

                {/* Cluster Count Badge */}
                {cluster.total > 0 && (
                  <g transform={`translate(${x + radius + 1}, ${y - radius - 4})`}>
                    <rect
                      x="0"
                      y="0"
                      width={cluster.delayed > 0 ? "20" : "14"}
                      height="11"
                      rx="3"
                      fill={cluster.delayed > 0 ? '#f59e0b' : '#1e293b'}
                      opacity="0.9"
                    />
                    <text
                      x={cluster.delayed > 0 ? "10" : "7"}
                      y="8"
                      textAnchor="middle"
                      className="text-[8px] font-mono font-bold fill-black select-none"
                    >
                      {cluster.delayed > 0 ? `+${cluster.delayed}` : cluster.total}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Airport Hover Tooltip */}
        {hoveredAirport && coordsMap.get(hoveredAirport.id) && (
          <div
            className="absolute z-30 pointer-events-none bg-[#141414] border border-[#333] rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs w-60 -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(coordsMap.get(hoveredAirport.id)![0] / width) * 100}%`,
              top: `${(coordsMap.get(hoveredAirport.id)![1] / height) * 100 - 3}%`,
            }}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-[#222]">
              <span className="font-bold text-white font-mono text-sm">
                {hoveredAirport.id} — {hoveredAirport.city}
              </span>
              <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                scenario && scenario.airportCode === hoveredAirport.id
                  ? 'bg-rose-500/20 text-rose-400'
                  : hoveredAirport.tier === 'mega_hub'
                  ? 'bg-cyan-500/20 text-cyan-300'
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {scenario && scenario.airportCode === hoveredAirport.id ? 'CLOSED' : hoveredAirport.tier.replace('_', ' ')}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 mt-1">
              {hoveredAirport.name}
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-[#222] font-mono text-[10px]">
              <div>
                <span className="text-slate-500 block">Delayed Flights:</span>
                <span className="font-bold text-amber-400">
                  {airportClusters.get(hoveredAirport.id)?.delayed || 0}
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Cap / Hour:</span>
                <span className="text-slate-200">
                  {hoveredAirport.capacity_per_hour} slots
                </span>
              </div>
            </div>
            <div className="text-[9px] text-cyan-400/80 mt-1.5 text-center">
              Click node to close airport
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
