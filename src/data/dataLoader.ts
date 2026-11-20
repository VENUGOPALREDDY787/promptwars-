import rawFlightNetwork from '../../data/flight_network.json';
import { 
  FlightNetworkDataset, 
  Airport, 
  RawFlight, 
  RawConnection, 
  RawCrew, 
  RawSpareAircraft 
} from '../types';

/**
 * Parses "HH:MM" string to minutes from 00:00 (e.g. "08:30" -> 510)
 */
export function timeStringToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  if (parts.length < 2) return 0;
  const hours = parseInt(parts[0], 10);
  const mins = parseInt(parts[1], 10);
  return (isNaN(hours) ? 0 : hours) * 60 + (isNaN(mins) ? 0 : mins);
}

/**
 * Formats minutes from 00:00 to "HH:MM" string (e.g. 510 -> "08:30")
 */
export function minutesToTimeString(minutes: number): string {
  const normalized = Math.max(0, Math.floor(minutes)) % 1440;
  const h = Math.floor(normalized / 60);
  const m = normalized % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
}

/**
 * Formats duration in minutes to human-readable string (e.g. 90 -> "1h 30m", 45 -> "45m")
 */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.floor(minutes % 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

/**
 * Strongly typed official dataset loaded directly from root `/data/flight_network.json`
 */
export const officialDataset: FlightNetworkDataset = rawFlightNetwork as FlightNetworkDataset;

// Quick access lookups
export const airportsMap = new Map<string, Airport>();
officialDataset.airports.forEach(a => airportsMap.set(a.id, a));

export const flightsMap = new Map<string, RawFlight>();
officialDataset.flights.forEach(f => flightsMap.set(f.flight_id, f));

export const crewsMap = new Map<string, RawCrew>();
officialDataset.crews.forEach(c => crewsMap.set(c.crew_id, c));

// Aircraft tail list
export const activeTailIds = Array.from(new Set(officialDataset.flights.map(f => f.tail_id))).sort();

// Flight to crew map
export const flightToCrewMap = new Map<string, string>();
officialDataset.crews.forEach(crew => {
  crew.flight_ids.forEach(fid => {
    flightToCrewMap.set(fid, crew.crew_id);
  });
});

/**
 * Verification of official dataset integrity
 */
export function verifyDatasetIntegrity() {
  const airportCount = officialDataset.airports.length;
  const flightCount = officialDataset.flights.length;
  const connectionCount = officialDataset.connections.length;
  const crewCount = officialDataset.crews.length;
  const spareCount = officialDataset.spare_aircraft.length;
  const uniqueTails = activeTailIds.length;

  return {
    airportCount,
    flightCount,
    connectionCount,
    crewCount,
    spareCount,
    uniqueTails,
    isValid: airportCount === 16 && flightCount === 70 && uniqueTails === 16
  };
}
