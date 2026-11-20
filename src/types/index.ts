// Domino Sky Official Types & Interfaces

export type AirportTier = 'mega_hub' | 'regional_hub' | 'spoke';

export interface Airport {
  id: string;          // e.g. "BOM", "DEL", "BLR"
  name: string;        // e.g. "Chhatrapati Shivaji Maharaj International"
  city: string;        // e.g. "Mumbai"
  lat: number;
  lng: number;
  tier: AirportTier;
  capacity_per_hour: number;
}

export interface RawFlight {
  flight_id: string;               // e.g. "DS0101"
  tail_id: string;                 // e.g. "VT-DS01"
  leg_order: number;               // 1, 2, 3...
  origin: string;                  // e.g. "DEL"
  destination: string;             // e.g. "JAI"
  dep: string;                     // "HH:MM" e.g. "08:00"
  arr: string;                     // "HH:MM" e.g. "08:50"
  block_minutes: number;           // e.g. 50
  pax: number;                     // e.g. 118
  turnaround_before_min: number | null; // e.g. 35, null for first leg
}

export interface RawConnection {
  connection_id: string;           // e.g. "CX01"
  airport: string;                 // e.g. "BOM"
  from_flight: string;             // e.g. "DS1201"
  to_flight: string;               // e.g. "DS1502"
  passengers: number;              // e.g. 43
  min_connect_minutes: number;     // e.g. 45
}

export interface RawCrew {
  crew_id: string;                 // e.g. "CR01"
  tail_id: string;                 // e.g. "VT-DS01"
  base: string;                    // e.g. "DEL"
  duty_start: string;              // "HH:MM" e.g. "07:15"
  max_duty_mins: number;           // e.g. 600
  flight_ids: string[];            // ["DS0101", "DS0102", ...]
}

export interface RawSpareAircraft {
  tail_id: string;                 // e.g. "VT-DS17"
  base: string;                    // e.g. "BLR"
  available_from: string;          // "HH:MM" e.g. "05:00"
  seats: number;                   // e.g. 180
}

export interface FlightNetworkDataset {
  meta: {
    dataset: string;
    operating_day: string;
    min_turnaround_minutes: number; // 30
    seats_per_aircraft: number;     // 180
    notes: string[];
  };
  airports: Airport[];
  flights: RawFlight[];
  connections: RawConnection[];
  crews: RawCrew[];
  spare_aircraft: RawSpareAircraft[];
}

// Causal Chain Step for "Why is this flight late?"
export interface CausalStep {
  step: number;
  description: string;
  minutes: number;
  type: 'CLOSURE' | 'ROTATION' | 'ABSORPTION' | 'CREW' | 'CONNECTION' | 'RECOVERY';
  flightId?: string;
  airportCode?: string;
  tailId?: string;
}

export type FlightStatus = 'ON_TIME' | 'DELAYED' | 'CANCELLED' | 'DIVERTED' | 'RECOVERED';
export type DelayRootCause = 'ROOT_CLOSURE' | 'AIRCRAFT_ROTATION' | 'CREW_DUTY' | 'CONNECTION_WAIT' | 'NONE';

export interface SimulatedFlight extends RawFlight {
  stdMinutes: number;              // Scheduled departure in minutes from 00:00
  staMinutes: number;              // Scheduled arrival in minutes from 00:00
  actualDepMinutes: number;        // Actual / Estimated departure (ETD)
  actualArrMinutes: number;        // Actual / Estimated arrival (ETA)
  departureDelay: number;          // Math.max(0, actualDepMinutes - stdMinutes)
  arrivalDelay: number;            // Math.max(0, actualArrMinutes - staMinutes)
  delayAbsorbedMinutes: number;    // Schedule buffer absorption
  status: FlightStatus;
  delayRootCause: DelayRootCause;
  causeChain: CausalStep[];
  passengersAffected: number;
  isRecovered?: boolean;
  assignedTailId: string;          // May change if spare assigned or swapped
  assignedCrewId: string;
}

export interface SimulatedConnection extends RawConnection {
  status: 'CONNECTED' | 'MISSED' | 'STRANDED';
  slackMinutes: number;            // to_flight.actualDep - (from_flight.actualArr + min_connect_minutes)
  fromFlightActualArr: number;
  toFlightActualDep: number;
  isHeld?: boolean;
}

export interface SimulatedCrew extends RawCrew {
  dutyStartMinutes: number;
  scheduledDutyEndMinutes: number;
  actualDutyEndMinutes: number;
  accumulatedDutyMinutes: number;
  isBreached: boolean;
  breachingFlightId?: string;
  isReassigned?: boolean;
}

export interface Scenario {
  airportCode: string;             // e.g. "BOM"
  closeStartMinutes: number;       // e.g. 540 (09:00)
  closeEndMinutes: number;         // e.g. 630 (10:30)
  durationMinutes: number;         // 90
  cancellationThresholdMinutes?: number; // default 240
}

export type RecoveryActionType = 'CANCEL_FLIGHT' | 'USE_SPARE' | 'SWAP_AIRCRAFT' | 'HOLD_CONNECTION' | 'SWAP_CREW';

export interface RecoveryAction {
  id: string;
  type: RecoveryActionType;
  title: string;
  description: string;
  targetFlightId?: string;
  spareTailId?: string;
  swapFlightId1?: string;
  swapFlightId2?: string;
  holdConnectionId?: string;
  holdExtraMinutes?: number;
  crewId?: string;
}

export interface SimulationMetrics {
  flightsDelayed: number;
  flightsCancelled: number;
  flightsRecovered: number;
  flightsOnTime: number;
  totalDelayMinutes: number;
  averageDelayMinutes: number;
  passengersStranded: number;
  missedConnectionsCount: number;
  crewsOverDutyLimit: number;
  airportsAffected: number;
  totalPassengers: number;
  totalFlights: number;
}

export interface SimulationResult {
  flights: SimulatedFlight[];
  connections: SimulatedConnection[];
  crews: SimulatedCrew[];
  metrics: SimulationMetrics;
  scenario: Scenario | null;
  appliedActions: RecoveryAction[];
  generatedAt?: string;
}
