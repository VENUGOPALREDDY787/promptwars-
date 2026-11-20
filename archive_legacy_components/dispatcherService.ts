import { 
  AirportClosure, 
  SimulationResult, 
  RecoveryAction, 
  Aircraft, 
  SimulatedFlight, 
  SimulatedCrewPairing, 
  SimulatedPassengerGroup 
} from '../types';

export interface DispatcherResponse {
  diagnosis: string;
  actions: RecoveryAction[];
}

export async function requestDispatcherRecommendations(
  simResult: SimulationResult,
  availableSpares: Aircraft[]
): Promise<DispatcherResponse> {
  const closure = simResult.closure;
  if (!closure) {
    throw new Error('No active airport closure to resolve.');
  }

  // Filter top delayed flights and violations
  const topDelayedFlights = simResult.flights
    .filter(f => f.arrivalDelay > 0 && f.status !== 'CANCELLED')
    .sort((a, b) => b.arrivalDelay - a.arrivalDelay)
    .slice(0, 6)
    .map(f => ({
      id: f.id,
      flightNumber: f.flightNumber,
      origin: f.origin,
      destination: f.destination,
      delayMins: f.arrivalDelay,
      tailNumber: f.tailNumber,
      rootCause: f.delayRootCause
    }));

  const crewViolations = simResult.crews
    .filter(c => c.isViolated)
    .map(c => ({
      id: c.id,
      name: c.name,
      accumulatedDuty: c.accumulatedDutyMinutes,
      maxDuty: c.maxDutyMinutes,
      violatingFlightId: c.violatingFlightId
    }));

  const strandedPax = simResult.passengers
    .filter(p => p.status === 'MISSED_CONNECTION' || p.status === 'STRANDED')
    .slice(0, 6)
    .map(p => ({
      id: p.id,
      paxCount: p.paxCount,
      brokenAtAirport: p.brokenAtAirport,
      brokenAtFlightId: p.brokenAtFlightId
    }));

  const payload = {
    closure,
    metrics: simResult.metrics,
    topDelayedFlights,
    crewViolations,
    strandedPax,
    availableSpares: availableSpares.map(s => ({
      tailNumber: s.tailNumber,
      model: s.model,
      currentStation: s.currentStation
    }))
  };

  try {
    const res = await fetch('/api/dispatcher/recommend', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      throw new Error(`Server returned ${res.status}`);
    }

    const data = await res.json();
    return data;
  } catch (error) {
    console.warn('API route failed, running deterministic local fallback dispatcher:', error);
    
    // Deterministic local recovery action generator
    const actions: RecoveryAction[] = [];
    let diagnosis = `Identified cascading turnaround bottlenecks at ${closure.airportCode}.`;

    if (availableSpares.length > 0 && topDelayedFlights.length > 0) {
      const spare = availableSpares[0];
      const target = topDelayedFlights[0];
      actions.push({
        id: 'ACT-LOC-01',
        type: 'USE_SPARE',
        title: `Deploy Standby Spare ${spare.tailNumber}`,
        description: `Swap in fresh spare ${spare.tailNumber} at ${spare.currentStation} for flight ${target.flightNumber} to cut the rotation cascade.`,
        targetFlightId: target.id,
        spareTailNumber: spare.tailNumber
      });
      diagnosis += ` Deploying spare ${spare.tailNumber} recovers downstream legs on that aircraft rotation.`;
    }

    if (crewViolations.length > 0 && crewViolations[0].violatingFlightId) {
      actions.push({
        id: 'ACT-LOC-02',
        type: 'CANCEL_FLIGHT',
        title: `Cancel Flight ${crewViolations[0].violatingFlightId}`,
        description: `Prevents crew duty violation and prevents extended passenger stranding.`,
        targetFlightId: crewViolations[0].violatingFlightId
      });
      diagnosis += ` Cancelling flight ${crewViolations[0].violatingFlightId} prevents legal crew duty timeouts.`;
    }

    return { diagnosis, actions };
  }
}
