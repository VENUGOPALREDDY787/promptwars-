import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Google GenAI client
const apiKey = process.env.GEMINI_API_KEY || '';
const aiClient = apiKey ? new GoogleGenAI({ apiKey }) : null;

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', hasGeminiKey: !!apiKey });
});

app.post('/api/dispatcher/recommend', async (req, res) => {
  try {
    const { 
      closure, 
      metrics, 
      topDelayedFlights, 
      crewViolations, 
      strandedPax, 
      availableSpares 
    } = req.body;

    if (!closure) {
      return res.status(400).json({ error: 'No active airport closure specified' });
    }

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

        const rawText = response.text || '{}';
        const parsed = JSON.parse(rawText);
        return res.json(parsed);
      } catch (geminiError: any) {
        console.warn('Gemini API call failed, falling back to deterministic heuristic recommendation:', geminiError.message);
      }
    }

    // Deterministic Rule-Based Fallback Dispatcher
    // Used when API key is not present or offline demo mode
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

    return res.json({
      diagnosis,
      actions: fallbackActions
    });

  } catch (err: any) {
    console.error('Dispatcher server error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate dispatcher recommendations' });
  }
});

app.listen(port, () => {
  console.log(`Domino Sky Dispatcher Server running at http://localhost:${port}`);
});
