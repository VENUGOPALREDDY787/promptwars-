import React, { useState } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { 
  X, 
  Bot, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  ArrowRight, 
  AlertCircle, 
  Wrench, 
  Ban, 
  Send, 
  TrendingDown,
  RefreshCw,
  GitBranch
} from 'lucide-react';
import { 
  generateCandidateActions, 
  verifyNumbersAgainstEngine, 
  generateDeterministicExplanation,
  EvaluatedAction 
} from '../services/aiDispatcherService';
import { simulate } from '../engine/simulation';
import { formatDuration } from '../data/dataLoader';

export const AiDispatcherModal: React.FC = () => {
  const {
    isAiModalOpen,
    setAiModalOpen,
    dataset,
    scenario,
    disruptedResult,
    recoveredResult,
    appliedActions,
    applyRecoveryAction,
    clearRecoveryActions,
    chatMessages,
    addChatMessage
  } = useSimulatorStore();

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [numbersVerified, setNumbersVerified] = useState(true);

  if (!isAiModalOpen) return null;

  // 1. Generate candidate actions deterministically from the engine
  const candidateActions = generateCandidateActions(dataset, scenario, disruptedResult);

  // 2. Generate baseline explanation
  const defaultExplanation = generateDeterministicExplanation(disruptedResult, candidateActions);

  const handleApplyAction = (action: EvaluatedAction) => {
    applyRecoveryAction(action);
  };

  const handleSendMessage = async () => {
    if (!inputQuery.trim()) return;
    const userText = inputQuery.trim();
    setInputQuery('');

    addChatMessage('user', userText);
    setLoading(true);

    try {
      // Deterministically route follow-up through simulation engine
      const lower = userText.toLowerCase();

      // Check if user is asking about a specific flight (e.g. "why is flight DS0703 late?")
      const flightMatch = userText.match(/DS\d{4}/i);
      if (flightMatch) {
        const fid = flightMatch[0].toUpperCase();
        const fl = disruptedResult.flights.find(f => f.flight_id === fid);
        if (fl) {
          let reply = `Flight ${fl.flight_id} (${fl.origin}→${fl.destination}): `;
          if (fl.arrivalDelay === 0) {
            reply += `Operated on time at ${fl.arr} with zero delay.`;
          } else {
            reply += `Arrived ${fl.arrivalDelay} minutes late due to ${fl.delayRootCause}. Causal steps: ` +
              fl.causeChain.map(s => `(${s.step}) ${s.description}`).join('; ');
          }
          addChatMessage('assistant', reply, true);
          setLoading(false);
          return;
        }
      }

      // Check if user asks "what if we close Delhi / BOM / BLR?"
      const airportMatch = dataset.airports.find(a => 
        lower.includes(a.id.toLowerCase()) || lower.includes(a.city.toLowerCase())
      );

      if (lower.includes('what if') && airportMatch) {
        // Run what-if scenario through deterministic engine
        const whatIfScenario = {
          airportCode: airportMatch.id,
          closeStartMinutes: 540,
          closeEndMinutes: 660,
          durationMinutes: 120
        };
        const whatIfResult = simulate(dataset, whatIfScenario, []);
        const reply = `What-If Engine Analysis: Closing ${airportMatch.id} (${airportMatch.city}) for 120 minutes produces ${whatIfResult.metrics.totalDelayMinutes} minutes of total delay across ${whatIfResult.metrics.flightsDelayed} flights and strands ${whatIfResult.metrics.passengersStranded} passengers.`;
        addChatMessage('assistant', reply, true);
        setLoading(false);
        return;
      }

      // Call API endpoint
      const response = await fetch('/api/dispatcher/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          closure: scenario,
          metrics: disruptedResult.metrics,
          topDelayedFlights: disruptedResult.flights.filter(f => f.arrivalDelay > 0).slice(0, 5),
          crewViolations: disruptedResult.crews.filter(c => c.isBreached),
          strandedPax: disruptedResult.connections.filter(c => c.status === 'MISSED'),
          availableSpares: dataset.spare_aircraft
        })
      });

      if (response.ok) {
        const data = await response.json();
        const aiText = data.diagnosis || data.summary || defaultExplanation;

        // NUMBER GUARDRAIL CHECK
        const verified = verifyNumbersAgainstEngine(aiText, disruptedResult, candidateActions);
        if (verified) {
          addChatMessage('assistant', aiText, true);
          setNumbersVerified(true);
        } else {
          // Number mismatch! Discard and fall back to template explanation
          addChatMessage('assistant', defaultExplanation, true);
          setNumbersVerified(true);
        }
      } else {
        addChatMessage('assistant', defaultExplanation, true);
      }
    } catch (err) {
      addChatMessage('assistant', defaultExplanation, true);
    } finally {
      setLoading(false);
    }
  };

  // Deltas for Before vs After comparison
  const dMetrics = disruptedResult.metrics;
  const rMetrics = recoveredResult.metrics;
  const delaySaved = dMetrics.totalDelayMinutes - rMetrics.totalDelayMinutes;
  const paxRescued = dMetrics.passengersStranded - rMetrics.passengersStranded;
  const crewsAvoided = dMetrics.crewsOverDutyLimit - rMetrics.crewsOverDutyLimit;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0E0E0E] border border-[#2A2A2A] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#141414]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-white shadow-md shadow-cyan-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">
                  AI Operations Dispatcher & Recovery Strategist
                </h3>
                {numbersVerified && (
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-emerald-400" />
                    All numbers verified against simulation
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Deterministic recovery validation • Zero numerical hallucination • Official dataset
              </p>
            </div>
          </div>

          <button
            onClick={() => setAiModalOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[#222] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* 1. Before vs After Split Impact Strip */}
          <div className="bg-[#141414] border border-[#222] rounded-xl p-4">
            <div className="text-xs font-bold text-white uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Before vs After Recovery Comparison</span>
              <span className="text-[10px] font-mono text-cyan-400">
                {appliedActions.length} Actions Applied
              </span>
            </div>

            <div className="grid grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#0A0A0A] border border-[#222]">
                <span className="text-slate-400 text-[10px] block">Delay Saved:</span>
                <span className="text-base font-bold text-emerald-400">
                  {delaySaved > 0 ? `-${delaySaved}m` : '0m'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {dMetrics.totalDelayMinutes}m → {rMetrics.totalDelayMinutes}m
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0A0A0A] border border-[#222]">
                <span className="text-slate-400 text-[10px] block">Pax Rescued:</span>
                <span className="text-base font-bold text-cyan-400">
                  {paxRescued > 0 ? `+${paxRescued}` : '0'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {dMetrics.passengersStranded} → {rMetrics.passengersStranded} stranded
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0A0A0A] border border-[#222]">
                <span className="text-slate-400 text-[10px] block">Crew Breaches:</span>
                <span className="text-base font-bold text-indigo-400">
                  {crewsAvoided > 0 ? `-${crewsAvoided}` : '0'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {dMetrics.crewsOverDutyLimit} → {rMetrics.crewsOverDutyLimit} breaches
                </span>
              </div>

              <div className="p-2.5 rounded-lg bg-[#0A0A0A] border border-[#222]">
                <span className="text-slate-400 text-[10px] block">Cancellations:</span>
                <span className="text-base font-bold text-rose-400">
                  {rMetrics.flightsCancelled}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {dMetrics.flightsCancelled} → {rMetrics.flightsCancelled} flights
                </span>
              </div>
            </div>
          </div>

          {/* 2. Candidate Tactical Actions Generated by Engine */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Ranked Candidate Recovery Actions ({candidateActions.length})
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Evaluated by deterministic engine
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {candidateActions.map(action => {
                const isApplied = appliedActions.some(a => a.id === action.id);

                return (
                  <div
                    key={action.id}
                    className={`p-3.5 rounded-xl bg-[#141414] border transition-all flex flex-col justify-between ${
                      isApplied ? 'border-emerald-500/60 bg-[#161f18]' : 'border-[#222] hover:border-cyan-500/40'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono flex items-center gap-1">
                          {action.type === 'USE_SPARE' ? <Wrench className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                          {action.type}
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          Saves {action.delaySavedMinutes}m
                        </span>
                      </div>

                      <div className="text-xs font-bold text-white mb-1">
                        {action.title}
                      </div>

                      <div className="text-[11px] text-slate-400 leading-relaxed">
                        {action.description}
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-[#222] flex items-center justify-between">
                      <span className="text-[10px] font-mono text-slate-500">
                        {action.paxRescued > 0 && `Rescues ${action.paxRescued} pax`}
                      </span>

                      <button
                        onClick={() => handleApplyAction(action)}
                        disabled={isApplied}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                          isApplied
                            ? 'bg-emerald-500/20 text-emerald-400 cursor-default'
                            : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm'
                        }`}
                      >
                        {isApplied ? 'Applied ✓' : 'Apply Action'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 3. Follow-Up Chat Box */}
          <div className="bg-[#141414] border border-[#222] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between pb-1.5 border-b border-[#222]">
              <span className="text-xs font-bold text-white">
                Operations Dispatcher Assistant
              </span>
              <span className="text-[10px] text-slate-500">
                Ask questions like "why is flight DS0703 late?" or "what if we close Delhi?"
              </span>
            </div>

            {/* Chat History */}
            <div className="max-h-40 overflow-y-auto space-y-2 pr-1 text-xs">
              {chatMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-xl ${
                    msg.role === 'user'
                      ? 'bg-cyan-950/40 border border-cyan-800/40 text-cyan-200 ml-8'
                      : 'bg-[#0A0A0A] border border-[#222] text-slate-300 mr-8'
                  }`}
                >
                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">
                    {msg.role === 'user' ? 'You' : 'AI Dispatcher (Engine Verified)'}
                  </div>
                  <div className="leading-relaxed">{msg.text}</div>
                </div>
              ))}
            </div>

            {/* Chat Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="Ask follow-up (e.g. why is flight DS0703 late? or what if we close Delhi?)..."
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="flex-1 bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-sans"
              />
              <button
                onClick={handleSendMessage}
                disabled={loading}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors flex items-center gap-1"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
