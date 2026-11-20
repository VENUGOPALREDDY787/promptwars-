import React, { useState } from 'react';
import { Airport, SimulatedFlight, AirportClosure } from '../types';
import { Plane, AlertTriangle } from 'lucide-react';

interface NetworkMapProps {
  airports: Airport[];
  flights: SimulatedFlight[];
  closure: AirportClosure | null;
  onSelectAirport?: (code: string) => void;
}

// Convert Lat/Lng to normalized SVG coordinates (US bounding box)
// US Lat: ~24 (Miami/Key West) to ~50 (Seattle/Borders)
// US Lng: ~-125 (West Coast) to ~-68 (East Coast)
function project(lat: number, lng: number, width: number, height: number): [number, number] {
  const minLat = 24.0;
  const maxLat = 50.0;
  const minLng = -125.0;
  const maxLng = -68.0;

  const x = ((lng - minLng) / (maxLng - minLng)) * (width - 120) + 60;
  // Invert y since SVG (0,0) is top-left
  const y = height - (((lat - minLat) / (maxLat - minLat)) * (height - 80) + 40);
  return [x, y];
}

export const NetworkMap: React.FC<NetworkMapProps> = ({
  airports,
  flights,
  closure,
  onSelectAirport
}) => {
  const [hoveredAirport, setHoveredAirport] = useState<Airport | null>(null);
  const [selectedRoute, setSelectedRoute] = useState<string | null>(null);

  const width = 900;
  const height = 480;

  // Build coordinate lookup
  const coordsMap = new Map<string, [number, number]>();
  airports.forEach(a => {
    coordsMap.set(a.code, project(a.lat, a.lng, width, height));
  });

  // Calculate delays and statistics per airport
  const airportStats = new Map<string, { inDelays: number; outDelays: number; totalDelay: number }>();
  airports.forEach(a => {
    airportStats.set(a.code, { inDelays: 0, outDelays: 0, totalDelay: 0 });
  });

  flights.forEach(f => {
    if (f.arrivalDelay > 0) {
      const destStat = airportStats.get(f.destination);
      if (destStat) {
        destStat.inDelays += 1;
        destStat.totalDelay += f.arrivalDelay;
      }
      const origStat = airportStats.get(f.origin);
      if (origStat) {
        origStat.outDelays += 1;
      }
    }
  });

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 relative overflow-hidden shadow-2xl">
      {/* Header and Legend */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Plane className="w-5 h-5 text-sky-400 rotate-45" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Live Airline Route & Cascading Wave Map
          </h3>
          <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
            {flights.length} Scheduled Flights • 16 Stations
          </span>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] font-medium">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 inline-block" />
            <span className="text-slate-300">On Time</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
            <span className="text-slate-300">Cascading Delay</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block animate-pulse" />
            <span className="text-slate-300">Closed Hub / Direct Delay</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas Map */}
      <div className="relative w-full aspect-[16/9] max-h-[500px] mt-2">
        <svg 
          viewBox={`0 0 ${width} ${height}`} 
          className="w-full h-full select-none"
        >
          <defs>
            {/* Pulsing ring for closed airport */}
            <radialGradient id="closedGlow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>
            
            {/* Subtle US outline grid effect */}
            <pattern id="radarGrid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.5" strokeOpacity="0.4" />
            </pattern>
          </defs>

          {/* Background grid */}
          <rect width={width} height={height} fill="url(#radarGrid)" />

          {/* 1. Draw Flight Routes (Curved Arcs) */}
          {flights.map(flight => {
            const originCoord = coordsMap.get(flight.origin);
            const destCoord = coordsMap.get(flight.destination);
            if (!originCoord || !destCoord) return null;

            const [x1, y1] = originCoord;
            const [x2, y2] = destCoord;

            // Arc curve midpoint calculation
            const dx = x2 - x1;
            const dy = y2 - y1;
            const dist = Math.sqrt(dx * dx + dy * dy);
            // Arc bend
            const cx = (x1 + x2) / 2 - (dy / dist) * (dist * 0.12);
            const cy = (y1 + y2) / 2 + (dx / dist) * (dist * 0.12);

            const pathD = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

            const isClosureFlight = closure && (flight.origin === closure.airportCode || flight.destination === closure.airportCode);
            const isCascading = flight.delayRootCause === 'AIRCRAFT_ROTATION' || (flight.arrivalDelay > 0 && !isClosureFlight);

            let strokeColor = '#0284c7'; // normal on-time sky
            let strokeWidth = 1.2;
            let strokeOpacity = 0.35;
            let strokeDash = '';

            if (flight.status === 'CANCELLED') {
              strokeColor = '#94a3b8';
              strokeOpacity = 0.2;
              strokeDash = '3,3';
            } else if (flight.arrivalDelay > 0) {
              if (isClosureFlight) {
                strokeColor = '#f43f5e'; // red
                strokeWidth = 2.2;
                strokeOpacity = 0.85;
              } else if (isCascading) {
                strokeColor = '#f59e0b'; // amber
                strokeWidth = 1.8;
                strokeOpacity = 0.75;
              }
            }

            return (
              <g key={flight.id} className="transition-all duration-300">
                <path
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeOpacity={strokeOpacity}
                  strokeDasharray={strokeDash}
                  className="hover:stroke-white hover:stroke-opacity-100 transition-colors cursor-pointer"
                  onClick={() => setSelectedRoute(flight.id)}
                />
              </g>
            );
          })}

          {/* 2. Closed Airport Wave Animation Effect */}
          {closure && coordsMap.get(closure.airportCode) && (
            <g>
              {(() => {
                const [cx, cy] = coordsMap.get(closure.airportCode)!;
                return (
                  <>
                    <circle cx={cx} cy={cy} r="48" fill="url(#closedGlow)" className="animate-pulse" />
                    <circle cx={cx} cy={cy} r="32" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeOpacity="0.7">
                      <animate attributeName="r" values="12;50" dur="2.4s" repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.8;0" dur="2.4s" repeatCount="indefinite" />
                    </circle>
                  </>
                );
              })()}
            </g>
          )}

          {/* 3. Draw Airport Nodes */}
          {airports.map(apt => {
            const coord = coordsMap.get(apt.code);
            if (!coord) return null;
            const [x, y] = coord;

            const isClosed = closure && closure.airportCode === apt.code;
            const stats = airportStats.get(apt.code) || { inDelays: 0, outDelays: 0, totalDelay: 0 };
            const hasDelays = stats.inDelays > 0 || stats.outDelays > 0;

            const nodeRadius = apt.hub ? 8 : 5.5;

            return (
              <g 
                key={apt.code} 
                className="cursor-pointer group"
                onMouseEnter={() => setHoveredAirport(apt)}
                onMouseLeave={() => setHoveredAirport(null)}
                onClick={() => onSelectAirport && onSelectAirport(apt.code)}
              >
                {/* Outer ring */}
                <circle
                  cx={x}
                  cy={y}
                  r={nodeRadius + 4}
                  fill="none"
                  stroke={isClosed ? '#ef4444' : hasDelays ? '#f59e0b' : '#38bdf8'}
                  strokeWidth="1.5"
                  strokeOpacity={isClosed ? 1 : 0.4}
                  className="group-hover:stroke-opacity-100 transition-all"
                />

                {/* Core dot */}
                <circle
                  cx={x}
                  cy={y}
                  r={nodeRadius}
                  fill={isClosed ? '#ef4444' : hasDelays ? '#f59e0b' : '#0284c7'}
                  className="transition-colors"
                />

                {/* Airport Code Label */}
                <text
                  x={x}
                  y={y - nodeRadius - 5}
                  textAnchor="middle"
                  className={`text-[10px] font-mono font-bold tracking-wider select-none ${
                    isClosed 
                      ? 'fill-rose-400' 
                      : hasDelays 
                      ? 'fill-amber-300' 
                      : 'fill-slate-300'
                  }`}
                >
                  {apt.code}
                </text>

                {/* Delay count pill if active */}
                {stats.inDelays > 0 && !isClosed && (
                  <text
                    x={x + 10}
                    y={y + 12}
                    className="text-[8px] font-mono font-bold fill-amber-400 bg-slate-900"
                  >
                    +{stats.inDelays}
                  </text>
                )}
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredAirport && coordsMap.get(hoveredAirport.code) && (
          <div 
            className="absolute z-20 pointer-events-none bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs w-56 -translate-x-1/2 -translate-y-full"
            style={{
              left: `${(coordsMap.get(hoveredAirport.code)![0] / width) * 100}%`,
              top: `${(coordsMap.get(hoveredAirport.code)![1] / height) * 100 - 4}%`,
            }}
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="font-bold text-white font-mono text-sm">
                {hoveredAirport.code}
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                closure && closure.airportCode === hoveredAirport.code 
                  ? 'bg-rose-500/20 text-rose-300' 
                  : hoveredAirport.hub 
                  ? 'bg-sky-500/20 text-sky-300' 
                  : 'bg-slate-800 text-slate-400'
              }`}>
                {closure && closure.airportCode === hoveredAirport.code 
                  ? 'AIRPORT CLOSED' 
                  : hoveredAirport.hub 
                  ? 'MAJOR HUB' 
                  : 'SPOKE'}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 mt-1 font-medium">
              {hoveredAirport.name}
            </div>
            <div className="text-[10px] text-slate-500">
              {hoveredAirport.city}, {hoveredAirport.state}
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-800 font-mono text-[11px]">
              <div>
                <span className="text-slate-400 text-[10px] block">Inbound Delays:</span>
                <span className="font-bold text-amber-400">
                  {airportStats.get(hoveredAirport.code)?.inDelays || 0} flights
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">MCT Buffer:</span>
                <span className="text-slate-200">
                  {hoveredAirport.minConnectionTimeMins} mins
                </span>
              </div>
            </div>

            <div className="text-[9px] text-sky-400/80 mt-2 text-center">
              Click airport node to toggle closure
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
