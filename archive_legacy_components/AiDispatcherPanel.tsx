import React, { useState } from 'react';
import { RecoveryAction, SimulationResult, Aircraft } from '../types';
import { requestDispatcherRecommendations } from '../services/dispatcherService';
import { Bot, Sparkles, CheckCircle2, ArrowRight, ShieldCheck, AlertCircle, Wrench, Ban, RefreshCw } from 'lucide-react';

interface AiDispatcherPanelProps {
  currentSimResult: SimulationResult;
  availableSpares: Aircraft[];
  appliedActions: RecoveryAction[];
  onApplyActions: (actions: RecoveryAction[]) => void;
  onClearActions: () => void;
}

export const AiDispatcherPanel: React.FC<AiDispatcherPanelProps> = ({
  currentSimResult,
  availableSpares,
  appliedActions,
  onApplyActions,
  onClearActions
}) => {
  const [loading, setLoading] = useState(false);
  const [diagnosis, setDiagnosis] = useState<string | null>(null);
  const [proposedActions, setProposedActions] = useState<RecoveryAction[]>([]);
  const [error, setError] = useState<string | null>(null);

  const hasClosure = !!currentSimResult.closure;

  const handleRequestPlan = async () => {
    if (!hasClosure) return;
    setLoading(true);
    setError(null);

    try {
      const res = await requestDispatcherRecommendations(currentSimResult, availableSpares);
      setDiagnosis(res.diagnosis);
      setProposedActions(res.actions);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch recommendations');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyProposed = () => {
    if (proposedActions.length > 0) {
      onApplyActions(proposedActions);
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
      {/* Glow highlight */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-sky-600 text-white shadow-lg shadow-sky-500/10">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white tracking-wide">
                AI Network Operations Dispatcher
              </h3>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5" /> Powered by Gemini
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Tactical recovery planner • Proposes actions validated by deterministic engine
            </p>
          </div>
        </div>

        {/* Action Button */}
        <div>
          <button
            onClick={handleRequestPlan}
            disabled={loading || !hasClosure}
            className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md ${
              !hasClosure
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                : loading
                ? 'bg-sky-600/50 text-white cursor-wait'
                : 'bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white shadow-sky-500/20'
            }`}
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Analyzing Rotations...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                Generate AI Recovery Plan
              </>
            )}
          </button>
        </div>
      </div>

      {/* Body / Content */}
      <div className="mt-4">
        {!hasClosure ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            <AlertCircle className="w-6 h-6 mx-auto mb-2 text-slate-600" />
            No active airport closure. Trigger a disruption in the control panel to engage the AI dispatcher.
          </div>
        ) : error ? (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
            {error}
          </div>
        ) : diagnosis || proposedActions.length > 0 ? (
          <div className="space-y-4">
            {/* AI Diagnosis Quote Card */}
            {diagnosis && (
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 leading-relaxed font-sans">
                <div className="text-[10px] font-bold text-sky-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <Bot className="w-3.5 h-3.5" /> Operational Diagnosis:
                </div>
                {diagnosis}
              </div>
            )}

            {/* Proposed Tactical Actions */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Proposed Recovery Tactics ({proposedActions.length})
                </span>
                <span className="text-[11px] text-slate-500">
                  Ready for deterministic engine validation
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {proposedActions.map((action, idx) => (
                  <div 
                    key={action.id || idx}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-sky-500/50 transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/20 text-sky-300 font-mono flex items-center gap-1">
                          {action.type === 'USE_SPARE' ? (
                            <>
                              <Wrench className="w-3 h-3 text-sky-400" /> SPARE DEPLOYMENT
                            </>
                          ) : action.type === 'CANCEL_FLIGHT' ? (
                            <>
                              <Ban className="w-3 h-3 text-rose-400" /> STRATEGIC CANCEL
                            </>
                          ) : (
                            action.type
                          )}
                        </span>
                        {action.targetFlightId && (
                          <span className="text-[10px] font-mono text-slate-400">
                            Target: <span className="text-white font-bold">{action.targetFlightId}</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-semibold text-white">
                        {action.title}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1">
                        {action.description}
                      </div>
                    </div>

                    {action.spareTailNumber && (
                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] font-mono">
                        <span className="text-slate-500">Standby Tail:</span>
                        <span className="text-emerald-400 font-bold">{action.spareTailNumber}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Verification Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="flex items-center gap-1.5 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Actions will be validated through the deterministic simulator.</span>
              </div>

              <div className="flex items-center gap-3">
                {appliedActions.length > 0 && (
                  <button
                    onClick={onClearActions}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Reset Recovery
                  </button>
                )}
                <button
                  onClick={handleApplyProposed}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Validate & Apply Recovery Plan
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-slate-400 text-xs">
            Airport disruption active. Click <span className="text-sky-400 font-semibold">"Generate AI Recovery Plan"</span> above to have Gemini recommend optimal spare deployments and rotation swaps.
          </div>
        )}
      </div>
    </div>
  );
};
