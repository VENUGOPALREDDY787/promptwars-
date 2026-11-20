import React from 'react';
import { SimulatedPassengerGroup } from '../types';
import { Users, AlertCircle, CheckCircle2, UserX } from 'lucide-react';

interface PassengerTableProps {
  passengers: SimulatedPassengerGroup[];
}

export const PassengerTable: React.FC<PassengerTableProps> = ({ passengers }) => {
  const strandedCount = passengers.filter(p => p.status === 'MISSED_CONNECTION' || p.status === 'STRANDED').length;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-sky-400" />
          <h3 className="text-sm font-bold text-white tracking-wide">
            Passenger Itineraries & Connection Slack Analysis
          </h3>
        </div>
        <div className="text-xs text-slate-400 font-mono">
          {strandedCount > 0 ? (
            <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
              {strandedCount} Disrupted Groups
            </span>
          ) : (
            <span className="text-emerald-400 font-semibold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              100% Connections Intact
            </span>
          )}
        </div>
      </div>

      <div className="overflow-x-auto mt-3">
        <table className="w-full text-left text-xs font-mono">
          <thead>
            <tr className="border-b border-slate-800 text-[11px] text-slate-400 uppercase tracking-wider">
              <th className="py-2.5 px-3">Group ID</th>
              <th className="py-2.5 px-3">Passengers</th>
              <th className="py-2.5 px-3">Flight Legs</th>
              <th className="py-2.5 px-3">Destination</th>
              <th className="py-2.5 px-3">Connection Slack</th>
              <th className="py-2.5 px-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {passengers.map(p => {
              const isMissed = p.status === 'MISSED_CONNECTION' || p.status === 'STRANDED';

              return (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2 px-3 font-bold text-slate-300">
                    {p.id}
                  </td>
                  <td className="py-2 px-3 font-semibold text-white">
                    {p.paxCount} pax
                  </td>
                  <td className="py-2 px-3 text-sky-400">
                    {p.flightIds.join(' ➔ ')}
                  </td>
                  <td className="py-2 px-3 text-slate-300 font-bold">
                    {p.finalDestination}
                  </td>
                  <td className="py-2 px-3">
                    {p.slackMinutes !== undefined ? (
                      p.slackMinutes < 0 ? (
                        <span className="text-rose-400 font-bold">
                          {p.slackMinutes}m (MISSED MCT)
                        </span>
                      ) : (
                        <span className="text-emerald-400">
                          +{p.slackMinutes}m slack
                        </span>
                      )
                    ) : (
                      <span className="text-slate-500">— Non-Stop —</span>
                    )}
                  </td>
                  <td className="py-2 px-3">
                    {isMissed ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 font-bold flex items-center gap-1 w-max">
                        <UserX className="w-3 h-3" />
                        STRANDED AT {p.brokenAtAirport || 'HUB'}
                      </span>
                    ) : p.status === 'DELAYED' ? (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-semibold">
                        DELAYED
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 flex items-center gap-1 w-max">
                        <CheckCircle2 className="w-3 h-3" /> ON SCHEDULE
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
