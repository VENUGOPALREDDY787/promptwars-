import React, { useState } from 'react';
import { useSimulatorStore } from '../store/useSimulatorStore';
import { 
  Plane, 
  Play, 
  RotateCcw, 
  Bell, 
  Sun, 
  Moon, 
  Download, 
  Zap, 
  Bot, 
  ShieldCheck, 
  AlertTriangle,
  LayoutGrid,
  Clock,
  Users,
  Sparkles,
  Printer
} from 'lucide-react';
import { minutesToTimeString, formatDuration } from '../data/dataLoader';

export const TopBar: React.FC = () => {
  const { 
    dataset, 
    scenario, 
    setScenario, 
    resetAll, 
    disruptedResult, 
    recoveredResult,
    viewMode,
    activeView,
    setActiveView,
    setAiModalOpen 
  } = useSimulatorStore();

  const [selectedAirport, setSelectedAirport] = useState(scenario ? scenario.airportCode : 'BOM');
  const [startTimeMins, setStartTimeMins] = useState(scenario ? scenario.closeStartMinutes : 540); // 09:00
  const [durationMins, setDurationMins] = useState(scenario ? scenario.durationMinutes : 90);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [showAlerts, setShowAlerts] = useState(false);

  const activeMetrics = viewMode === 'AFTER' ? recoveredResult.metrics : disruptedResult.metrics;
  const alertCount = activeMetrics.flightsDelayed + activeMetrics.passengersStranded + activeMetrics.crewsOverDutyLimit;

  const handleRunSimulation = () => {
    setScenario({
      airportCode: selectedAirport,
      closeStartMinutes: startTimeMins,
      closeEndMinutes: startTimeMins + durationMins,
      durationMinutes: durationMins
    });
  };

  const handleApplyPreset = (code: string, start: number, duration: number) => {
    setSelectedAirport(code);
    setStartTimeMins(start);
    setDurationMins(duration);
    setScenario({
      airportCode: code,
      closeStartMinutes: start,
      closeEndMinutes: start + duration,
      durationMinutes: duration
    });
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(recoveredResult, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `domino_sky_scenario_${scenario?.airportCode || 'nominal'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <header className="h-14 border-b border-[#222] bg-[#0A0A0A] text-slate-100 flex items-center justify-between px-4 select-none sticky top-0 z-50">
      {/* 1. App Logo & Brand */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
          <Plane className="w-4 h-4 rotate-45" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono font-bold tracking-wider text-sm text-white">
              DOMINO SKY
            </span>
            <span className="text-[10px] uppercase font-semibold tracking-wider px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Control Room
            </span>
          </div>
          <div className="text-[10px] text-slate-500 -mt-0.5">
            Airline Disruption & Cascade Simulator
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div className="hidden md:flex items-center gap-1 bg-[#141414] p-1 rounded-lg border border-[#222] ml-2">
          <button
            onClick={() => setActiveView('OPERATIONS')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === 'OPERATIONS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Operations (3-Pane)
          </button>
          <button
            onClick={() => setActiveView('GANTT')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === 'GANTT'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" /> Gantt Timeline
          </button>
          <button
            onClick={() => setActiveView('CONNECTIONS')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === 'CONNECTIONS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" /> Passenger Matrix
          </button>
          <button
            onClick={() => setActiveView('ANALYTICS')}
            className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
              activeView === 'ANALYTICS'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" /> Recovery Lab
          </button>
        </div>
      </div>

      {/* 2. Scenario Controls Bar */}
      <div className="hidden lg:flex items-center gap-3 bg-[#141414] px-3 py-1 rounded-xl border border-[#222]">
        {/* Airport Dropdown */}
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-slate-400 font-medium">Close Airport:</span>
          <select
            value={selectedAirport}
            onChange={(e) => setSelectedAirport(e.target.value)}
            className="bg-[#0A0A0A] border border-[#333] rounded px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
          >
            {dataset.airports.map(apt => (
              <option key={apt.id} value={apt.id}>
                {apt.id} ({apt.city}) {apt.tier === 'mega_hub' ? '★' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="h-4 w-[1px] bg-[#333]" />

        {/* Start Time Slider */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Start:</span>
          <span className="font-mono font-semibold text-cyan-400 w-12 text-center">
            {minutesToTimeString(startTimeMins)}
          </span>
          <input
            type="range"
            min={300} // 05:00
            max={1260} // 21:00
            step={15}
            value={startTimeMins}
            onChange={(e) => setStartTimeMins(Number(e.target.value))}
            className="w-20 h-1.5 accent-cyan-500 bg-[#222] rounded cursor-pointer"
          />
        </div>

        <div className="h-4 w-[1px] bg-[#333]" />

        {/* Duration Slider */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400">Duration:</span>
          <span className="font-mono font-semibold text-amber-400 w-14 text-center">
            {formatDuration(durationMins)}
          </span>
          <input
            type="range"
            min={30}
            max={300}
            step={15}
            value={durationMins}
            onChange={(e) => setDurationMins(Number(e.target.value))}
            className="w-20 h-1.5 accent-amber-500 bg-[#222] rounded cursor-pointer"
          />
        </div>

        <div className="h-4 w-[1px] bg-[#333]" />

        {/* Run & Reset */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleRunSimulation}
            className="px-3 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs transition-colors flex items-center gap-1 shadow-sm shadow-cyan-600/30"
          >
            <Play className="w-3 h-3 fill-current" /> Run
          </button>
          <button
            onClick={resetAll}
            className="p-1.5 rounded hover:bg-[#222] text-slate-400 hover:text-white transition-colors"
            title="Reset Simulation"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. Scenario Presets Dropdown/Pills */}
      <div className="hidden xl:flex items-center gap-1 text-[11px]">
        <span className="text-slate-500 text-[10px] uppercase font-bold mr-1">Presets:</span>
        <button
          onClick={() => handleApplyPreset('BOM', 540, 90)}
          className={`px-2 py-0.5 rounded border transition-colors ${
            scenario?.airportCode === 'BOM' && scenario?.durationMinutes === 90
              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 font-semibold'
              : 'bg-[#141414] border-[#222] text-slate-400 hover:text-white'
          }`}
        >
          Mumbai Monsoon (90m)
        </button>
        <button
          onClick={() => handleApplyPreset('DEL', 420, 240)}
          className={`px-2 py-0.5 rounded border transition-colors ${
            scenario?.airportCode === 'DEL' && scenario?.durationMinutes === 240
              ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 font-semibold'
              : 'bg-[#141414] border-[#222] text-slate-400 hover:text-white'
          }`}
        >
          Delhi Fog (4h)
        </button>
        <button
          onClick={() => handleApplyPreset('BLR', 1020, 150)}
          className={`px-2 py-0.5 rounded border transition-colors ${
            scenario?.airportCode === 'BLR' && scenario?.durationMinutes === 150
              ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300 font-semibold'
              : 'bg-[#141414] border-[#222] text-slate-400 hover:text-white'
          }`}
        >
          BLR Evening (2.5h)
        </button>
      </div>

      {/* 4. Action Buttons (AI Dispatcher, Alerts, Export, Dark Toggle) */}
      <div className="flex items-center gap-2">
        {/* Ask AI Dispatcher Button */}
        <button
          onClick={() => setAiModalOpen(true)}
          className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
        >
          <Bot className="w-3.5 h-3.5 text-cyan-400" />
          <span>Ask AI Dispatcher</span>
        </button>

        {/* Notification Bell */}
        <div className="relative">
          <button
            onClick={() => setShowAlerts(!showAlerts)}
            className="p-2 rounded-lg bg-[#141414] hover:bg-[#222] border border-[#222] text-slate-300 relative transition-colors"
            title="Active Operational Alerts"
          >
            <Bell className="w-4 h-4" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white font-mono text-[9px] font-bold flex items-center justify-center animate-pulse">
                {alertCount > 9 ? '9+' : alertCount}
              </span>
            )}
          </button>

          {/* Alerts Popup */}
          {showAlerts && (
            <div className="absolute right-0 top-11 w-64 bg-[#141414] border border-[#333] rounded-xl p-3 shadow-2xl z-50 text-xs space-y-2">
              <div className="font-bold text-white flex items-center justify-between pb-1 border-b border-[#222]">
                <span>Active Network Alerts</span>
                <span className="text-[10px] text-rose-400 font-mono font-semibold">
                  {alertCount} issues
                </span>
              </div>
              <div className="text-slate-300 space-y-1 text-[11px]">
                <div className="flex justify-between">
                  <span>Delayed Flights:</span>
                  <span className="font-mono text-amber-400 font-bold">{activeMetrics.flightsDelayed}</span>
                </div>
                <div className="flex justify-between">
                  <span>Stranded Passengers:</span>
                  <span className="font-mono text-rose-400 font-bold">{activeMetrics.passengersStranded}</span>
                </div>
                <div className="flex justify-between">
                  <span>Crew Duty Breaches:</span>
                  <span className="font-mono text-rose-500 font-bold">{activeMetrics.crewsOverDutyLimit}</span>
                </div>
                <div className="flex justify-between">
                  <span>Airports Disrupted:</span>
                  <span className="font-mono text-slate-200">{activeMetrics.airportsAffected}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Export JSON Button */}
        <button
          onClick={handleExportJSON}
          className="p-2 rounded-lg bg-[#141414] hover:bg-[#222] border border-[#222] text-slate-300 hover:text-white transition-colors"
          title="Export Simulation JSON"
        >
          <Download className="w-4 h-4" />
        </button>

        {/* Print / PDF Briefing Export */}
        <button
          onClick={() => window.print()}
          className="p-2 rounded-lg bg-[#141414] hover:bg-[#222] border border-[#222] text-slate-300 hover:text-white transition-colors"
          title="Print Executive Disruption Briefing / PDF"
        >
          <Printer className="w-4 h-4" />
        </button>

        {/* Dark/Light Toggle */}
        <button
          onClick={() => setIsDarkMode(!isDarkMode)}
          className="p-2 rounded-lg bg-[#141414] hover:bg-[#222] border border-[#222] text-slate-300 hover:text-white transition-colors"
          title="Toggle Theme"
        >
          {isDarkMode ? <Moon className="w-4 h-4 text-cyan-400" /> : <Sun className="w-4 h-4 text-amber-400" />}
        </button>
      </div>
    </header>
  );
};
