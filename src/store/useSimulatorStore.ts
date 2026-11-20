import { create } from 'zustand';
import { 
  FlightNetworkDataset, 
  Scenario, 
  RecoveryAction, 
  SimulationResult, 
  SimulatedFlight 
} from '../types';
import { officialDataset } from '../data/dataLoader';
import { simulate } from '../engine/simulation';

interface SimulatorState {
  dataset: FlightNetworkDataset;
  scenario: Scenario | null;
  appliedActions: RecoveryAction[];
  
  // Simulation results
  disruptedResult: SimulationResult;
  recoveredResult: SimulationResult;
  
  // View controls
  selectedFlightId: string;
  timeScrubberMinutes: number;
  isPlaying: boolean;
  viewMode: 'BEFORE' | 'AFTER';
  mapLayer: 'HEATMAP' | 'CHAINS' | 'CREW_RISK';
  isAiModalOpen: boolean;
  activeView: 'OPERATIONS' | 'GANTT' | 'CONNECTIONS' | 'ANALYTICS';
  
  // AI State
  aiExplanation: string | null;
  aiRecommendations: RecoveryAction[];
  isAiLoading: boolean;
  numbersVerified: boolean;
  chatMessages: { role: 'user' | 'assistant'; text: string; verified?: boolean }[];

  // Actions
  setScenario: (scenario: Scenario | null) => void;
  applyRecoveryAction: (action: RecoveryAction) => void;
  removeRecoveryAction: (actionId: string) => void;
  clearRecoveryActions: () => void;
  setSelectedFlightId: (id: string) => void;
  setTimeScrubberMinutes: (mins: number) => void;
  togglePlay: () => void;
  setViewMode: (mode: 'BEFORE' | 'AFTER') => void;
  setMapLayer: (layer: 'HEATMAP' | 'CHAINS' | 'CREW_RISK') => void;
  setActiveView: (view: 'OPERATIONS' | 'GANTT' | 'CONNECTIONS' | 'ANALYTICS') => void;
  setAiModalOpen: (open: boolean) => void;
  setAiRecommendations: (explanation: string, actions: RecoveryAction[], verified: boolean) => void;
  setAiLoading: (loading: boolean) => void;
  addChatMessage: (role: 'user' | 'assistant', text: string, verified?: boolean) => void;
  resetAll: () => void;
}

// Initial default scenario: Mumbai Monsoon (90 mins, 09:00 - 10:30)
const defaultScenario: Scenario = {
  airportCode: 'BOM',
  closeStartMinutes: 540,
  closeEndMinutes: 630,
  durationMinutes: 90
};

const initialDisrupted = simulate(officialDataset, defaultScenario, []);
const initialRecovered = simulate(officialDataset, defaultScenario, []);

export const useSimulatorStore = create<SimulatorState>((set, get) => ({
  dataset: officialDataset,
  scenario: defaultScenario,
  appliedActions: [],
  disruptedResult: initialDisrupted,
  recoveredResult: initialRecovered,
  selectedFlightId: initialDisrupted.flights.find(f => f.arrivalDelay > 0)?.flight_id || 'DS0703',
  timeScrubberMinutes: 600, // 10:00 AM
  isPlaying: false,
  viewMode: 'AFTER',
  mapLayer: 'CHAINS',
  activeView: 'OPERATIONS',
  isAiModalOpen: false,
  aiExplanation: null,
  aiRecommendations: [],
  isAiLoading: false,
  numbersVerified: true,
  chatMessages: [
    {
      role: 'assistant',
      text: 'Operations Control ready. A 90-minute monsoon closure at Mumbai (BOM) has caused cascading rotational delays to Hyderabad and Bengaluru. Ask me for recommendations or causal explanations.',
      verified: true
    }
  ],

  setScenario: (newScenario: Scenario | null) => {
    const ds = get().dataset;
    const newDisrupted = simulate(ds, newScenario, []);
    const newRecovered = simulate(ds, newScenario, get().appliedActions);
    const delayedFlight = newDisrupted.flights.find(f => f.arrivalDelay > 0);

    set({
      scenario: newScenario,
      disruptedResult: newDisrupted,
      recoveredResult: newRecovered,
      selectedFlightId: delayedFlight ? delayedFlight.flight_id : get().selectedFlightId,
      aiExplanation: null,
      aiRecommendations: []
    });
  },

  applyRecoveryAction: (action: RecoveryAction) => {
    const existing = get().appliedActions;
    if (existing.some(a => a.id === action.id)) return;
    const updated = [...existing, action];
    const newRecovered = simulate(get().dataset, get().scenario, updated);
    set({
      appliedActions: updated,
      recoveredResult: newRecovered,
      viewMode: 'AFTER'
    });
  },

  removeRecoveryAction: (actionId: string) => {
    const updated = get().appliedActions.filter(a => a.id !== actionId);
    const newRecovered = simulate(get().dataset, get().scenario, updated);
    set({
      appliedActions: updated,
      recoveredResult: newRecovered
    });
  },

  clearRecoveryActions: () => {
    const newRecovered = simulate(get().dataset, get().scenario, []);
    set({
      appliedActions: [],
      recoveredResult: newRecovered,
      viewMode: 'BEFORE'
    });
  },

  setSelectedFlightId: (id: string) => {
    set({ selectedFlightId: id });
  },

  setTimeScrubberMinutes: (mins: number) => {
    set({ timeScrubberMinutes: Math.max(0, Math.min(1440, mins)) });
  },

  togglePlay: () => {
    set({ isPlaying: !get().isPlaying });
  },

  setViewMode: (mode: 'BEFORE' | 'AFTER') => {
    set({ viewMode: mode });
  },

  setMapLayer: (layer: 'HEATMAP' | 'CHAINS' | 'CREW_RISK') => {
    set({ mapLayer: layer });
  },

  setActiveView: (view: 'OPERATIONS' | 'GANTT' | 'CONNECTIONS' | 'ANALYTICS') => {
    set({ activeView: view });
  },

  setAiModalOpen: (open: boolean) => {
    set({ isAiModalOpen: open });
  },

  setAiRecommendations: (explanation: string, actions: RecoveryAction[], verified: boolean) => {
    set({
      aiExplanation: explanation,
      aiRecommendations: actions,
      numbersVerified: verified
    });
  },

  setAiLoading: (loading: boolean) => {
    set({ isAiLoading: loading });
  },

  addChatMessage: (role: 'user' | 'assistant', text: string, verified = true) => {
    set({
      chatMessages: [...get().chatMessages, { role, text, verified }]
    });
  },

  resetAll: () => {
    const freshDisrupted = simulate(get().dataset, null, []);
    set({
      scenario: null,
      appliedActions: [],
      disruptedResult: freshDisrupted,
      recoveredResult: freshDisrupted,
      aiExplanation: null,
      aiRecommendations: [],
      viewMode: 'BEFORE'
    });
  }
}));
