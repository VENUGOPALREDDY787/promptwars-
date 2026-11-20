import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const apiKey = process.env.GEMINI_API_KEY || '';
const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Embedded Vite API middleware for single-command zero-friction execution
function apiMiddlewarePlugin() {
  return {
    name: 'api-middleware',
    configureServer(server: any) {
      server.middlewares.use('/api/health', (req: any, res: any) => {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ status: 'ok', hasGeminiKey: !!apiKey }));
      });

      server.middlewares.use('/api/dispatcher/recommend', async (req: any, res: any) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          return res.end('Method Not Allowed');
        }

        let body = '';
        req.on('data', (chunk: any) => { body += chunk; });
        req.on('end', async () => {
          try {
            const data = JSON.parse(body);
            const { closure, metrics, topDelayedFlights, crewViolations, strandedPax, availableSpares } = data;

            const promptContext = `
You are the AI Network Operations Dispatcher for Domino Sky Airlines.
An airport closure has triggered cascading delays across the network.
YOUR TASK:
Analyze the deterministic disruption data and propose 1 to 3 tactical recovery actions to mitigate delays, prevent crew duty violations, and rescue stranded passengers.

IMPORTANT RULES:
- You must NEVER calculate or invent numerical delay minutes, passenger counts, or duty hours. All numbers are calculated by the deterministic simulation engine.
- You only diagnose the root bottleneck and propose structured recovery actions.
- Supported Action Types:
  1. "USE_SPARE": Assign an available spare aircraft at a station to a delayed flight.
     Format: { "type": "USE_SPARE", "targetFlightId": "FLIGHT_ID", "spareTailId": "SPARE_TAIL", "title": "...", "description": "..." }
  2. "SWAP_AIRCRAFT": Swap aircraft between two flights at the same station.
     Format: { "type": "SWAP_AIRCRAFT", "swapFlightId1": "FLIGHT_ID_1", "swapFlightId2": "FLIGHT_ID_2", "title": "...", "description": "..." }
  3. "CANCEL_FLIGHT": Strategically cancel a low-load or high-cascading flight to protect crew or downstream connections.
     Format: { "type": "CANCEL_FLIGHT", "targetFlightId": "FLIGHT_ID", "title": "...", "description": "..." }
  4. "HOLD_CONNECTION": Hold a connecting flight on the ground for a short duration to save connecting passengers.
     Format: { "type": "HOLD_CONNECTION", "holdConnectionId": "CX_ID", "holdExtraMinutes": 15, "title": "...", "description": "..." }

CURRENT SITUATION:
- Closed Airport: ${closure?.airportCode || 'None'}
- Closure Window: ${closure?.closeStartMinutes || 0}m to ${closure?.closeEndMinutes || 0}m (${closure?.durationMinutes || 0} minutes)
- Total Flights Delayed: ${metrics?.flightsDelayed || 0}
- Total Delay Minutes: ${metrics?.totalDelayMinutes || 0}m
- Stranded Passengers: ${metrics?.passengersStranded || 0}
- Crew Duty Breaches: ${metrics?.crewsOverDutyLimit || 0}

TOP DELAYED FLIGHTS:
${JSON.stringify(topDelayedFlights, null, 2)}

CREW VIOLATIONS:
${JSON.stringify(crewViolations, null, 2)}

MISSED CONNECTIONS:
${JSON.stringify(strandedPax, null, 2)}

AVAILABLE STANDBY SPARES:
${JSON.stringify(availableSpares, null, 2)}

Respond with STRICT JSON only in the following schema:
{
  "diagnosis": "Concise 2-3 sentence operational analysis of the cascading choke point",
  "actions": [
    {
      "id": "ACT-1",
      "type": "USE_SPARE",
      "title": "Short title",
      "description": "Clear rationale",
      "targetFlightId": "optional flight id",
      "spareTailId": "optional spare tail",
      "swapFlightId1": "optional flight 1",
      "swapFlightId2": "optional flight 2",
      "holdConnectionId": "optional connection id",
      "holdExtraMinutes": 0
    }
  ]
}
`;

            if (aiClient) {
              try {
                const response = await aiClient.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: promptContext,
                  config: {
                    responseMimeType: 'application/json'
                  }
                });

                res.setHeader('Content-Type', 'application/json');
                return res.end(response.text || '{}');
              } catch (err: any) {
                console.warn('Gemini API call failed, falling back to local heuristic dispatcher:', err.message);
              }
            }

            // Fallback deterministic proposal
            const fallbackActions: any[] = [];
            let diagnosis = `Airport closure at ${closure?.airportCode || 'Hub'} for ${closure?.durationMinutes || 0} mins is causing rotational cascades downstream.`;

            if (availableSpares && availableSpares.length > 0 && topDelayedFlights && topDelayedFlights.length > 0) {
              const spare = availableSpares[0];
              const candidateFlight = topDelayedFlights.find((f: any) => f.origin === spare.base || f.destination === spare.base) || topDelayedFlights[0];

              fallbackActions.push({
                id: 'ACT-SPARE-01',
                type: 'USE_SPARE',
                title: `Deploy Standby Spare ${spare.tail_id} at ${spare.base}`,
                description: `Substitutes delayed inbound aircraft on flight ${candidateFlight.flight_id} with fresh spare ${spare.tail_id} at ${spare.base}.`,
                targetFlightId: candidateFlight.flight_id,
                spareTailId: spare.tail_id
              });
              diagnosis += ` Deploying spare ${spare.tail_id} absorbs the cascade on flight ${candidateFlight.flight_id}.`;
            }

            if (crewViolations && crewViolations.length > 0 && crewViolations[0].breachingFlightId) {
              fallbackActions.push({
                id: 'ACT-CANCEL-01',
                type: 'CANCEL_FLIGHT',
                title: `Cancel Flight ${crewViolations[0].breachingFlightId}`,
                description: `Protects crew from exceeding maximum 10-hour duty limits.`,
                targetFlightId: crewViolations[0].breachingFlightId
              });
            }

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ diagnosis, actions: fallbackActions }));

          } catch (e: any) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: e.message }));
          }
        });
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), apiMiddlewarePlugin()],
  server: {
    port: 3000
  }
});
