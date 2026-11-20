import {
  FlightNetworkDataset,
  RawFlight,
  RawConnection,
  RawCrew,
  Airport,
  Scenario,
  RecoveryAction,
  SimulatedFlight,
  SimulatedConnection,
  SimulatedCrew,
  SimulationResult,
  SimulationMetrics,
  CausalStep,
  FlightStatus,
  DelayRootCause
} from '../types';
import { timeStringToMinutes, minutesToTimeString } from '../data/dataLoader';

/**
 * Pure Deterministic Simulation Engine for Domino Sky
 * Single source of truth. No AI, zero hallucination.
 * Required signature: simulate(dataset, scenario, actions?) -> result
 */
export function simulate(
  dataset: FlightNetworkDataset,
  scenario: Scenario | null,
  actions: RecoveryAction[] = []
): SimulationResult {
  const minTurnaround = dataset.meta.min_turnaround_minutes; // 30 minutes
  const cancellationThreshold = scenario?.cancellationThresholdMinutes ?? 240; // 4 hours max hold

  // Build lookups
  const airportLookup = new Map<string, Airport>();
  dataset.airports.forEach(a => airportLookup.set(a.id, a));

  const flightToCrewId = new Map<string, string>();
  dataset.crews.forEach(c => {
    c.flight_ids.forEach(fid => flightToCrewId.set(fid, c.crew_id));
  });

  // Track applied actions
  const cancelledFlightIds = new Set<string>();
  const spareAssignments = new Map<string, string>(); // flight_id -> spare_tail_id
  const aircraftSwaps = new Map<string, string>(); // flight_id -> swapped_tail_id
  const heldConnections = new Map<string, number>(); // to_flight_id -> extraMinutes
  const swappedCrewIds = new Set<string>();

  actions.forEach(action => {
    if (action.type === 'CANCEL_FLIGHT' && action.targetFlightId) {
      cancelledFlightIds.add(action.targetFlightId);
    } else if (action.type === 'USE_SPARE' && action.targetFlightId && action.spareTailId) {
      spareAssignments.set(action.targetFlightId, action.spareTailId);
    } else if (action.type === 'SWAP_AIRCRAFT' && action.swapFlightId1 && action.swapFlightId2) {
      const f1 = dataset.flights.find(f => f.flight_id === action.swapFlightId1);
      const f2 = dataset.flights.find(f => f.flight_id === action.swapFlightId2);
      if (f1 && f2) {
        aircraftSwaps.set(f1.flight_id, f2.tail_id);
        aircraftSwaps.set(f2.flight_id, f1.tail_id);
      }
    } else if (action.type === 'HOLD_CONNECTION' && action.targetFlightId && action.holdExtraMinutes) {
      heldConnections.set(action.targetFlightId, action.holdExtraMinutes);
    } else if (action.type === 'SWAP_CREW' && action.crewId) {
      swappedCrewIds.add(action.crewId);
    }
  });

  // 1. Group flights by aircraft rotation (tail_id) and sort by leg_order
  const flightsByTail = new Map<string, RawFlight[]>();
  dataset.flights.forEach(f => {
    const tail = f.tail_id;
    if (!flightsByTail.has(tail)) {
      flightsByTail.set(tail, []);
    }
    flightsByTail.get(tail)!.push(f);
  });

  flightsByTail.forEach(list => list.sort((a, b) => a.leg_order - b.leg_order));

  // 2. Track simulation state per flight
  const simFlightMap = new Map<string, SimulatedFlight>();

  // Process all aircraft rotations
  flightsByTail.forEach((chain, originalTailId) => {
    let prevActualArrMinutes: number | null = null;
    let prevFlightId: string | null = null;
    let prevDelayMinutes = 0;
    let chainAccumulatedCause: CausalStep[] = [];

    chain.forEach(flight => {
      const fid = flight.flight_id;
      const std = timeStringToMinutes(flight.dep);
      const sta = timeStringToMinutes(flight.arr);
      const blockMins = flight.block_minutes;

      // Check tail assignment (may be replaced by spare or swapped)
      let effectiveTail = originalTailId;
      let isRecovered = false;

      if (spareAssignments.has(fid)) {
        effectiveTail = spareAssignments.get(fid)!;
        isRecovered = true;
        // Spare aircraft is fresh at base, breaking the incoming rotation delay!
        prevActualArrMinutes = null;
        prevDelayMinutes = 0;
        chainAccumulatedCause = [
          {
            step: 1,
            description: `Spare aircraft ${effectiveTail} deployed at ${flight.origin} — incoming rotation delay cleared`,
            minutes: 0,
            type: 'RECOVERY',
            flightId: fid,
            tailId: effectiveTail
          }
        ];
      } else if (aircraftSwaps.has(fid)) {
        effectiveTail = aircraftSwaps.get(fid)!;
        isRecovered = true;
      }

      // Check cancellation action
      if (cancelledFlightIds.has(fid)) {
        const simCancelled: SimulatedFlight = {
          ...flight,
          stdMinutes: std,
          staMinutes: sta,
          actualDepMinutes: std,
          actualArrMinutes: sta,
          departureDelay: 0,
          arrivalDelay: 0,
          delayAbsorbedMinutes: 0,
          status: 'CANCELLED',
          delayRootCause: 'NONE',
          causeChain: [
            {
              step: 1,
              description: `Flight cancelled by tactical dispatcher recovery action`,
              minutes: 0,
              type: 'RECOVERY',
              flightId: fid
            }
          ],
          passengersAffected: flight.pax,
          isRecovered: false,
          assignedTailId: effectiveTail,
          assignedCrewId: flightToCrewId.get(fid) || 'CR01'
        };
        simFlightMap.set(fid, simCancelled);
        // Cancelled flight frees subsequent legs from this arrival time
        prevActualArrMinutes = null;
        prevDelayMinutes = 0;
        return;
      }

      // Calculate Earliest Departure by Aircraft Rotation & Schedule Buffer Absorption
      let earliestDepByRotation = std;
      let absorbedDelay = 0;
      const flightCausalSteps: CausalStep[] = [];

      if (prevActualArrMinutes !== null) {
        const requiredReadyTime = prevActualArrMinutes + minTurnaround;
        const scheduledTurnaround = flight.turnaround_before_min ?? minTurnaround;
        const scheduleSlack = Math.max(0, scheduledTurnaround - minTurnaround);

        if (requiredReadyTime > std) {
          // Turnaround delay propagates
          earliestDepByRotation = requiredReadyTime;
          const rawDelay = earliestDepByRotation - std;
          absorbedDelay = Math.min(scheduleSlack, prevDelayMinutes);

          // Copy prior causal steps
          flightCausalSteps.push(...chainAccumulatedCause);
          flightCausalSteps.push({
            step: flightCausalSteps.length + 1,
            description: `Inbound flight ${prevFlightId} arrived late. Schedule turnaround buffer (${scheduledTurnaround}m) absorbed ${absorbedDelay}m delay; ${rawDelay}m passed to ${fid}`,
            minutes: rawDelay,
            type: 'ROTATION',
            flightId: fid,
            tailId: effectiveTail
          });
        } else {
          // Delay was completely absorbed by schedule buffer!
          absorbedDelay = prevDelayMinutes;
          if (prevDelayMinutes > 0) {
            flightCausalSteps.push(...chainAccumulatedCause);
            flightCausalSteps.push({
              step: flightCausalSteps.length + 1,
              description: `Schedule buffer (${scheduledTurnaround}m) fully absorbed previous ${prevDelayMinutes}m delay. Departs on time.`,
              minutes: 0,
              type: 'ABSORPTION',
              flightId: fid,
              tailId: effectiveTail
            });
          }
        }
      }

      // Check Airport Closure Constraints
      let departureFromClosure = earliestDepByRotation;
      let arrivalFromClosure = departureFromClosure + blockMins;
      let closureTriggered = false;

      if (scenario) {
        const { airportCode, closeStartMinutes, closeEndMinutes } = scenario;

        // A. Closure at Origin: cannot depart during [closeStart, closeEnd)
        if (flight.origin === airportCode) {
          if (departureFromClosure >= closeStartMinutes && departureFromClosure < closeEndMinutes) {
            closureTriggered = true;
            const holdMins = closeEndMinutes - departureFromClosure;
            departureFromClosure = closeEndMinutes;
            arrivalFromClosure = departureFromClosure + blockMins;

            flightCausalSteps.unshift({
              step: flightCausalSteps.length + 1,
              description: `Airport closure at ${airportCode} (${minutesToTimeString(closeStartMinutes)} - ${minutesToTimeString(closeEndMinutes)}) held departure by ${holdMins}m`,
              minutes: holdMins,
              type: 'CLOSURE',
              airportCode,
              flightId: fid
            });
          }
        }

        // B. Closure at Destination (Ground Delay Program): cannot land during [closeStart, closeEnd)
        if (flight.destination === airportCode) {
          if (arrivalFromClosure >= closeStartMinutes && arrivalFromClosure < closeEndMinutes) {
            closureTriggered = true;
            const holdMins = closeEndMinutes - arrivalFromClosure;
            arrivalFromClosure = closeEndMinutes;
            departureFromClosure = arrivalFromClosure - blockMins;

            flightCausalSteps.unshift({
              step: flightCausalSteps.length + 1,
              description: `Ground Delay Program: Destination ${airportCode} closed (${minutesToTimeString(closeStartMinutes)} - ${minutesToTimeString(closeEndMinutes)}). Origin departure held by ${holdMins}m to meet reopening slot`,
              minutes: holdMins,
              type: 'CLOSURE',
              airportCode,
              flightId: fid
            });
          }
        }
      }

      // Check Connection Hold Action
      if (heldConnections.has(fid)) {
        const extra = heldConnections.get(fid)!;
        departureFromClosure += extra;
        arrivalFromClosure += extra;
        flightCausalSteps.push({
          step: flightCausalSteps.length + 1,
          description: `Flight held on ground for +${extra}m to protect connecting passengers`,
          minutes: extra,
          type: 'CONNECTION',
          flightId: fid
        });
      }

      // Final Computed Times
      const actualDep = Math.max(earliestDepByRotation, departureFromClosure);
      const actualArr = actualDep + blockMins;
      const depDelay = Math.max(0, actualDep - std);
      const arrDelay = Math.max(0, actualArr - sta);

      // Check Cancellation Threshold
      let finalStatus: FlightStatus = 'ON_TIME';
      let rootCause: DelayRootCause = 'NONE';

      if (depDelay >= cancellationThreshold) {
        finalStatus = 'CANCELLED';
        flightCausalSteps.push({
          step: flightCausalSteps.length + 1,
          description: `Total ground delay (${depDelay}m) exceeded 4-hour cancellation threshold (${cancellationThreshold}m) — flight cancelled`,
          minutes: depDelay,
          type: 'CLOSURE',
          flightId: fid
        });
      } else if (arrDelay > 0) {
        finalStatus = isRecovered ? 'RECOVERED' : 'DELAYED';
        if (closureTriggered) {
          rootCause = 'ROOT_CLOSURE';
        } else if (earliestDepByRotation > std) {
          rootCause = 'AIRCRAFT_ROTATION';
        } else {
          rootCause = 'ROOT_CLOSURE';
        }
      } else {
        finalStatus = 'ON_TIME';
        rootCause = 'NONE';
        if (flightCausalSteps.length === 0) {
          flightCausalSteps.push({
            step: 1,
            description: `Flight operated on schedule`,
            minutes: 0,
            type: 'ROTATION',
            flightId: fid
          });
        }
      }

      const simFlight: SimulatedFlight = {
        ...flight,
        stdMinutes: std,
        staMinutes: sta,
        actualDepMinutes: actualDep,
        actualArrMinutes: actualArr,
        departureDelay: depDelay,
        arrivalDelay: arrDelay,
        delayAbsorbedMinutes: absorbedDelay,
        status: finalStatus,
        delayRootCause: rootCause,
        causeChain: flightCausalSteps,
        passengersAffected: finalStatus === 'CANCELLED' ? flight.pax : 0,
        isRecovered,
        assignedTailId: effectiveTail,
        assignedCrewId: flightToCrewId.get(fid) || 'CR01'
      };

      simFlightMap.set(fid, simFlight);

      // State for next leg
      prevActualArrMinutes = finalStatus === 'CANCELLED' ? null : actualArr;
      prevFlightId = fid;
      prevDelayMinutes = arrDelay;
      chainAccumulatedCause = flightCausalSteps;
    });
  });

  // 3. Evaluate Passenger Connections
  let strandedCountFromConnections = 0;
  const simConnections: SimulatedConnection[] = dataset.connections.map(conn => {
    const fromFl = simFlightMap.get(conn.from_flight);
    const toFl = simFlightMap.get(conn.to_flight);

    if (!fromFl || !toFl) {
      return {
        ...conn,
        status: 'STRANDED',
        slackMinutes: -999,
        fromFlightActualArr: 0,
        toFlightActualDep: 0
      };
    }

    if (fromFl.status === 'CANCELLED' || toFl.status === 'CANCELLED') {
      strandedCountFromConnections += conn.passengers;
      return {
        ...conn,
        status: 'STRANDED',
        slackMinutes: -999,
        fromFlightActualArr: fromFl.actualArrMinutes,
        toFlightActualDep: toFl.actualDepMinutes
      };
    }

    const minConnect = conn.min_connect_minutes;
    const slack = toFl.actualDepMinutes - (fromFl.actualArrMinutes + minConnect);

    if (slack < 0) {
      strandedCountFromConnections += conn.passengers;
      // Also increment passengersAffected on the broken flight
      toFl.passengersAffected += conn.passengers;
      return {
        ...conn,
        status: 'MISSED',
        slackMinutes: slack,
        fromFlightActualArr: fromFl.actualArrMinutes,
        toFlightActualDep: toFl.actualDepMinutes,
        isHeld: heldConnections.has(conn.to_flight)
      };
    }

    return {
      ...conn,
      status: 'CONNECTED',
      slackMinutes: slack,
      fromFlightActualArr: fromFl.actualArrMinutes,
      toFlightActualDep: toFl.actualDepMinutes,
      isHeld: heldConnections.has(conn.to_flight)
    };
  });

  // 4. Evaluate Crew Duty Hour Constraints
  let crewBreachCount = 0;
  const simCrews: SimulatedCrew[] = dataset.crews.map(crew => {
    const dutyStart = timeStringToMinutes(crew.duty_start);
    let schedEnd = dutyStart;
    let actualEnd = dutyStart;
    let isBreached = false;
    let breachingFid: string | undefined;

    const crewFlights = crew.flight_ids
      .map(fid => simFlightMap.get(fid))
      .filter((f): f is SimulatedFlight => f !== undefined);

    crewFlights.forEach(fl => {
      if (fl.staMinutes > schedEnd) schedEnd = fl.staMinutes;
      if (fl.status !== 'CANCELLED' && fl.actualArrMinutes > actualEnd) {
        actualEnd = fl.actualArrMinutes;
      }
    });

    const accumulatedDuty = actualEnd - dutyStart;

    // Check if crew swapped
    const isSwapped = swappedCrewIds.has(crew.crew_id);

    if (!isSwapped && accumulatedDuty > crew.max_duty_mins) {
      isBreached = true;
      crewBreachCount++;

      // Find first flight where duty exceeded limit
      for (const fl of crewFlights) {
        if (fl.actualArrMinutes - dutyStart > crew.max_duty_mins) {
          breachingFid = fl.flight_id;
          if (fl.delayRootCause === 'NONE') {
            fl.delayRootCause = 'CREW_DUTY';
          }
          break;
        }
      }
    }

    return {
      ...crew,
      dutyStartMinutes: dutyStart,
      scheduledDutyEndMinutes: schedEnd,
      actualDutyEndMinutes: actualEnd,
      accumulatedDutyMinutes: isSwapped ? Math.min(accumulatedDuty, crew.max_duty_mins) : accumulatedDuty,
      isBreached: isSwapped ? false : isBreached,
      breachingFlightId: breachingFid,
      isReassigned: isSwapped
    };
  });

  // 5. Aggregate Deterministic Metrics
  const allSimFlights = Array.from(simFlightMap.values());
  const delayedFlights = allSimFlights.filter(f => f.status === 'DELAYED' || (f.arrivalDelay > 0 && f.status !== 'CANCELLED'));
  const cancelledFlights = allSimFlights.filter(f => f.status === 'CANCELLED');
  const recoveredFlights = allSimFlights.filter(f => f.status === 'RECOVERED' || f.isRecovered);
  const onTimeFlights = allSimFlights.filter(f => f.status === 'ON_TIME' && f.arrivalDelay === 0);

  const totalDelayMinutes = allSimFlights.reduce((acc, f) => acc + (f.status === 'CANCELLED' ? 0 : f.arrivalDelay), 0);
  const activeFlightsCount = allSimFlights.length - cancelledFlights.length;
  const avgDelay = activeFlightsCount > 0 ? Math.round(totalDelayMinutes / activeFlightsCount) : 0;

  // Stranded passengers = missed connection pax + cancelled flight pax
  const cancelledFlightPax = cancelledFlights.reduce((acc, f) => acc + f.pax, 0);
  const totalStrandedPax = strandedCountFromConnections + cancelledFlightPax;
  const missedConnectionsCount = simConnections.filter(c => c.status === 'MISSED' || c.status === 'STRANDED').length;

  // Affected airports
  const affectedAirportCodes = new Set<string>();
  if (scenario) affectedAirportCodes.add(scenario.airportCode);
  delayedFlights.forEach(f => {
    affectedAirportCodes.add(f.origin);
    affectedAirportCodes.add(f.destination);
  });
  cancelledFlights.forEach(f => {
    affectedAirportCodes.add(f.origin);
    affectedAirportCodes.add(f.destination);
  });

  const totalPax = dataset.flights.reduce((acc, f) => acc + f.pax, 0);

  const metrics: SimulationMetrics = {
    flightsDelayed: delayedFlights.length,
    flightsCancelled: cancelledFlights.length,
    flightsRecovered: recoveredFlights.length,
    flightsOnTime: onTimeFlights.length,
    totalDelayMinutes,
    averageDelayMinutes: avgDelay,
    passengersStranded: totalStrandedPax,
    missedConnectionsCount,
    crewsOverDutyLimit: crewBreachCount,
    airportsAffected: affectedAirportCodes.size,
    totalPassengers: totalPax,
    totalFlights: allSimFlights.length
  };

  return {
    flights: allSimFlights,
    connections: simConnections,
    crews: simCrews,
    metrics,
    scenario,
    appliedActions: actions,
    generatedAt: new Date().toISOString()
  };
}
