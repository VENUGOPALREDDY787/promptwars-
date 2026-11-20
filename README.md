# ✈️ Domino Sky: Airline Disruption & Cascading Recovery Simulator

**Domino Sky** is a production-grade, interactive airline operations center simulator that models cascading flight delays, aircraft rotations, passenger connection breaks, and crew duty limits when an airport experiences an unscheduled closure.

---

## 🌟 Core Architecture & Engineering Principles

### 1. Pure Deterministic Simulation Engine
- **Single Source of Truth**: All delays, passenger connection slacks, and crew duty accumulations are computed by a discrete deterministic simulation engine (`src/engine/simulation.ts`).
- **Zero AI Hallucination**: AI **never** calculates or invents numerical metrics. Every single metric originates from the deterministic engine.
- **Closed-Loop Action Validation**: Every recovery action proposed by the AI Dispatcher is injected back into the deterministic simulation engine to compute verifiable Before-and-After metrics.

### 2. Operational Rules Implemented
- **Aircraft Rotations**: Inbound flight delay propagates to the aircraft's subsequent leg if arrival time + airport turnaround buffer exceeds scheduled departure (`ETD = max(STD, Inbound_ETA + Turnaround)`).
- **Airport Ground Delay Program (GDP)**: Destination closures impose ground holds at the origin to ensure arrival occurs after reopening.
- **Passenger Connections (MCT)**: Passengers connect between legs across the network. If connecting flight `ETD < Inbound_ETA + MCT`, the connection breaks and passengers become **Stranded at Hub**.
- **Crew Flight Duty Period (FDP)**: Crews accumulate duty minutes starting 45 mins prior to their first flight. Exceeding 12 hours (720 minutes) triggers a legal `CREW_DUTY_VIOLATION`.

### 3. Dataset Specifications
- **16 Airports**: Major hubs and spokes with real geospatial coordinates: ORD, DFW, ATL, DEN, LAX, JFK, SFO, MIA, CLT, SEA, PHX, BOS, MCO, MSP, DTW, PHL.
- **70 Scheduled Flights**: Chained across 14 aircraft rotations spanning the full day.
- **16 Aircraft**: 14 active rotation airframes (A321neo, B738, A320) + 2 designated standby spares (`N901SP` at ORD, `N902SP` at DFW).
- **28 Crew Pairings**: Real legal duty windows.
- **Connecting Passenger Itineraries**: Point-to-point and cross-fleet hub connection groups with Minimum Connection Times (MCT).

---

## 🚀 Quick Start

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Gemini API (Optional)
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your Gemini API Key in `.env`:
```env
GEMINI_API_KEY=your_key_here
```
*(Note: If no API key is provided, the simulator seamlessly activates its deterministic fallback dispatcher, ensuring 100% functionality in offline demo environments).*

### 3. Run the Application
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 4. Run Deterministic Unit Tests
```bash
npx tsx src/engine/simulation.test.ts
```

---

## 🛠 Tech Stack
- **Frontend**: React 18, Vite 6, TypeScript, Tailwind CSS, Lucide Icons
- **Simulation**: Pure TypeScript Discrete Event Cascade Engine
- **AI Dispatcher**: Google GenAI SDK (`@google/genai`) using `gemini-3.8-flash`
- **Backend / Proxy**: Express + Embedded Vite Server Middleware
