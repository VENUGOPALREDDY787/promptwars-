import React from 'react';
import { useSimulatorStore } from './store/useSimulatorStore';
import { TopBar } from './components/TopBar';
import { LeftPaneFlightList } from './components/LeftPaneFlightList';
import { CenterPaneFlightDetail } from './components/CenterPaneFlightDetail';
import { RightPaneMap } from './components/RightPaneMap';
import { BottomBar } from './components/BottomBar';
import { AiDispatcherModal } from './components/AiDispatcherModal';
import { GanttTimelineView } from './components/GanttTimelineView';
import { PassengerConnectionsView } from './components/PassengerConnectionsView';
import { RecoveryAnalyticsView } from './components/RecoveryAnalyticsView';

export const App: React.FC = () => {
  const { 
    activeView, 
    setActiveView, 
    togglePlay, 
    isAiModalOpen, 
    setAiModalOpen 
  } = useSimulatorStore();

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === '1') {
        setActiveView('OPERATIONS');
      } else if (e.key === '2') {
        setActiveView('GANTT');
      } else if (e.key === '3') {
        setActiveView('CONNECTIONS');
      } else if (e.key === '4') {
        setActiveView('ANALYTICS');
      } else if (e.key === 'Escape' && isAiModalOpen) {
        setAiModalOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, setActiveView, isAiModalOpen, setAiModalOpen]);

  return (
    <div className="h-screen w-screen bg-[#0A0A0A] text-slate-100 flex flex-col font-sans select-none overflow-hidden">
      {/* 1. TOP BAR WITH NAVIGATION TABS */}
      <TopBar />

      {/* 2. DYNAMIC WORKSPACE VIEW */}
      {activeView === 'OPERATIONS' && (
        <main className="flex-1 flex flex-row min-h-0 overflow-hidden relative">
          {/* Left Pane: Flight List (70 flights) */}
          <LeftPaneFlightList />

          {/* Center Pane: Selected Flight Detail */}
          <CenterPaneFlightDetail />

          {/* Right Pane: Network Map */}
          <RightPaneMap />
        </main>
      )}

      {activeView === 'GANTT' && (
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          <GanttTimelineView />
        </main>
      )}

      {activeView === 'CONNECTIONS' && (
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          <PassengerConnectionsView />
        </main>
      )}

      {activeView === 'ANALYTICS' && (
        <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
          <RecoveryAnalyticsView />
        </main>
      )}

      {/* 3. BOTTOM BAR: Time Scrubber & KPI Strip */}
      <BottomBar />

      {/* 4. MODALS: AI Dispatcher */}
      <AiDispatcherModal />
    </div>
  );
};

export default App;
