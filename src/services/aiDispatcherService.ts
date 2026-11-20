import { 
  FlightNetworkDataset, 
  Scenario, 
  RecoveryAction, 
  SimulationResult 
} from '../types';
import { simulate } from '../engine/simulation';
import { minutesToTimeString, formatDuration } from '../data/dataLoader';

export interface EvaluatedAction extends RecoveryAction {
  delaySavedMinutes: number;
  paxRescued: number;
  crewBreachesResolved: number;
  isBeneficial: boolean;
  score: number;
}

/**
 * Deterministically generates candidate operational recovery actions
 * based on actual spares, bottlenecks, and connection margins.
 */
export function generateCandidateActions(
  dataset: FlightNetworkDataset,
  scenario: Scenario | null,
  currentResult: SimulationResult
): EvaluatedAction[] {
  if (!scenario) return [];

  const candidates: RecoveryAction[] = [];
  const baseMetrics = currentResult.metrics;

  // 1. Check Available Standby Spares
  // Spares in dataset: VT-DS17 at BLR, VT-DS18 at DEL
  dataset.spare_aircraft.forEach(spare => {
    // Find delayed flights departing from spare's base
    const matchingFlights = currentResult.flights.filter(f => 
      f.origin === spare.base && 
      f.arrivalDelay > 15 && 
      f.status !== 'CANCELLED'
    );

    matchingFlights.forEach(fl => {
      candidates.push({
        id: `ACT-SPARE-${spare.tail_id}-${fl.flight_id}`,
        type: 'USE_SPARE',
        title: `Deploy Standby Spare ${spare.tail_id} at ${spare.base}`,
        description: `Substitutes delayed inbound airframe on flight ${fl.flight_id} (${fl.origin}→${fl.destination}) with fresh spare ${spare.tail_id} at ${spare.base}. Clears incoming rotation delay.`,
        targetFlightId: fl.flight_id,
        spareTailId: spare.tail_id
      });
    });
  });

  // 2. Check Feasible Connection Holds
  // If holding to_flight by 15-20m rescues passengers with minimal downstream ripple
  currentResult.connections.forEach(conn => {
    if (conn.status === 'MISSED' && conn.slackMinutes >= -30 && conn.slackMinutes < 0) {
      const neededHold = Math.abs(conn.slackMinutes) + 5;
      candidates.push({
        id: `ACT-HOLD-${conn.connection_id}`,
        type: 'HOLD_CONNECTION',
        title: `Hold Connecting Flight ${conn.to_flight} (+${neededHold}m) at ${conn.airport}`,
        description: `Holds flight ${conn.to_flight} on the ground for +${neededHold} mins at ${conn.airport} to protect ${conn.passengers} connecting passengers arriving from ${conn.from_flight}.`,
        targetFlightId: conn.to_flight,
        holdConnectionId: conn.connection_id,
        holdExtraMinutes: neededHold
      });
    }
  });

  // 3. Strategic Flight Cancellation for Extreme Cascades or Crew Breaches
  const severeFlights = currentResult.flights
    .filter(f => f.arrivalDelay >= 60 && f.status !== 'CANCELLED')
    .sort((a, b) => b.arrivalDelay - a.arrivalDelay)
    .slice(0, 3);

  severeFlights.forEach(fl => {
    candidates.push({
      id: `ACT-CANCEL-${fl.flight_id}`,
      type: 'CANCEL_FLIGHT',
      title: `Tactical Cancellation: Flight ${fl.flight_id}`,
      description: `Cancels high-delay flight ${fl.flight_id} (${fl.origin}→${fl.destination}, +${fl.arrivalDelay}m delay) to prevent downstream aircraft rotation cascade.`,
      targetFlightId: fl.flight_id
    });
  });

  // 4. Crew Swap if breached
  currentResult.crews.forEach(c => {
    if (c.isBreached) {
      candidates.push({
        id: `ACT-CREW-${c.crew_id}`,
        type: 'SWAP_CREW',
        title: `Reserve Crew Reassignment for ${c.crew_id} at ${c.base}`,
        description: `Swaps in fresh reserve crew at base ${c.base} to eliminate duty hour breach of ${formatDuration(c.accumulatedDutyMinutes - c.max_duty_mins)}.`,
        crewId: c.crew_id
      });
    }
  });

  // 5. Evaluate Every Candidate Action through the Pure Deterministic Simulation Engine
  const evaluated: EvaluatedAction[] = candidates.map(action => {
    // Run independent simulation with this action applied
    const testResult = simulate(dataset, scenario, [action]);
    const delaySaved = baseMetrics.totalDelayMinutes - testResult.metrics.totalDelayMinutes;
    const paxRescued = baseMetrics.passengersStranded - testResult.metrics.passengersStranded;
    const crewBreachesResolved = baseMetrics.crewsOverDutyLimit - testResult.metrics.crewsOverDutyLimit;

    // Composite operational score
    const score = (delaySaved * 1.0) + (paxRescued * 2.5) + (crewBreachesResolved * 50);
    const isBeneficial = delaySaved > 0 || paxRescued > 0 || crewBreachesResolved > 0;

    return {
      ...action,
      delaySavedMinutes: delaySaved,
      paxRescued,
      crewBreachesResolved,
      isBeneficial,
      score
    };
  });

  // Filter only beneficial actions and sort by score descending
  return evaluated
    .filter(a => a.isBeneficial)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);
}

/**
 * NUMBER GUARDRAIL:
 * Extracts all numbers in AI text and verifies they match known simulation engine numbers.
 */
export function verifyNumbersAgainstEngine(
  text: string, 
  simResult: SimulationResult, 
  candidates: EvaluatedAction[]
): boolean {
  if (!text) return true;

  // Extract all numbers from text (e.g. "90", "280", "15")
  const matches = text.match(/\b\d+(\.\d+)?\b/g);
  if (!matches) return true;

  // Collect all valid numbers produced by the simulation engine
  const validNumbers = new Set<number>();
  validNumbers.add(0);
  validNumbers.add(1);
  validNumbers.add(2);
  validNumbers.add(3);
  validNumbers.add(4);
  validNumbers.add(5); // rank / list indices

  // Add metrics
  const m = simResult.metrics;
  validNumbers.add(m.totalDelayMinutes);
  validNumbers.add(m.flightsDelayed);
  validNumbers.add(m.flightsCancelled);
  validNumbers.add(m.passengersStranded);
  validNumbers.add(m.missedConnectionsCount);
  validNumbers.add(m.crewsOverDutyLimit);
  validNumbers.add(m.airportsAffected);
  validNumbers.add(m.averageDelayMinutes);
  validNumbers.add(m.totalFlights);
  validNumbers.add(m.totalPassengers);

  // Add scenario window
  if (simResult.scenario) {
    validNumbers.add(simResult.scenario.durationMinutes);
    validNumbers.add(simResult.scenario.closeStartMinutes);
    validNumbers.add(simResult.scenario.closeEndMinutes);
  }

  // Add candidate savings
  candidates.forEach(c => {
    validNumbers.add(c.delaySavedMinutes);
    validNumbers.add(c.paxRescued);
    validNumbers.add(c.crewBreachesResolved);
  });

  // Add flight delays and numbers
  simResult.flights.forEach(f => {
    validNumbers.add(f.arrivalDelay);
    validNumbers.add(f.departureDelay);
    validNumbers.add(f.pax);
    validNumbers.add(f.block_minutes);
    f.causeChain.forEach(step => validNumbers.add(step.minutes));
  });

  // Add connection counts
  simResult.connections.forEach(c => {
    validNumbers.add(c.passengers);
    validNumbers.add(c.min_connect_minutes);
    validNumbers.add(Math.abs(c.slackMinutes));
  });

  // Verify that every single number in AI text exists in validNumbers
  for (const match of matches) {
    const num = parseFloat(match);
    if (!isNaN(num) && !validNumbers.has(num)) {
      // Unverified or invented number detected!
      return false;
    }
  }

  return true;
}

/**
 * Deterministic template explanation generator from engine data
 * Used as fallback whenever AI fails or number guardrail trips.
 */
export function generateDeterministicExplanation(
  simResult: SimulationResult,
  evaluatedActions: EvaluatedAction[]
): string {
  const m = simResult.metrics;
  const s = simResult.scenario;

  if (!s) {
    return 'All stations nominal. Zero flight delays and all passenger connections intact.';
  }

  let text = `Closure at ${s.airportCode} for ${s.durationMinutes} minutes generated ${m.totalDelayMinutes} minutes of total delay across ${m.flightsDelayed} flights affecting ${m.airportsAffected} airports.`;

  if (m.passengersStranded > 0) {
    text += ` ${m.passengersStranded} passengers were stranded due to ${m.missedConnectionsCount} broken connection intervals.`;
  }

  if (m.crewsOverDutyLimit > 0) {
    text += ` ${m.crewsOverDutyLimit} crew pairings exceeded legal 10-hour duty limits.`;
  }

  if (evaluatedActions.length > 0) {
    const top = evaluatedActions[0];
    text += ` Primary recovery tactic: ${top.title}, recovering ${top.delaySavedMinutes} minutes of delay`;
    if (top.paxRescued > 0) {
      text += ` and rescuing ${top.paxRescued} passengers.`;
    } else {
      text += '.';
    }
  }

  return text;
}
