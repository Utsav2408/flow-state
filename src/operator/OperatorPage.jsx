import React from 'react';
import { BottomNav } from '../components/ui/BottomNav';
import { OperatorToast } from './OperatorDashboardWidgets';
import {
  OperatorDashboardHeader,
  OperatorDashboardLeftColumn,
  OperatorDashboardRightColumn,
} from './OperatorDashboardPanels';
import { useOperatorDashboardState } from './useOperatorDashboardState';

export const OperatorPage = () => {
  const {
    zones,
    stands,
    simTimeSecs,
    matchLabel,
    matchColor,
    fanCount,
    capPct,
    avgWait,
    waitDelta,
    waitDeltaLabel,
    activeRoutes,
    departedPct,
    matchPhase,
    comfortScore,
    comfortDelta,
    comfortDeltaLabel,
    allAlerts,
    nearestWait,
    crowdLevel,
    fanActiveRoutes,
    aiActionTitle,
    speed,
    updateSimSpeed,
    activeTriggerEvent,
    pulsingTriggerEvent,
    lastTriggerMeta,
    clearActiveTrigger,
    handleTriggerEvent,
    toast,
  } = useOperatorDashboardState();

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-slate-100 font-sans">
      <OperatorDashboardHeader
        simTimeSecs={simTimeSecs}
        matchLabel={matchLabel}
        matchColor={matchColor}
      />

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_240px]">
        <OperatorDashboardLeftColumn
          fanCount={fanCount}
          capPct={capPct}
          avgWait={avgWait}
          waitDelta={waitDelta}
          waitDeltaLabel={waitDeltaLabel}
          activeRoutes={activeRoutes}
          departedPct={departedPct}
          matchPhase={matchPhase}
          comfortScore={comfortScore}
          comfortDelta={comfortDelta}
          comfortDeltaLabel={comfortDeltaLabel}
          zones={zones}
          stands={stands}
          allAlerts={allAlerts}
        />

        <OperatorDashboardRightColumn
          simTimeSecs={simTimeSecs}
          matchLabel={matchLabel}
          matchColor={matchColor}
          comfortScore={comfortScore}
          nearestWait={nearestWait}
          crowdLevel={crowdLevel}
          fanActiveRoutes={fanActiveRoutes}
          aiActionTitle={aiActionTitle}
          speed={speed}
          updateSimSpeed={updateSimSpeed}
          activeTriggerEvent={activeTriggerEvent}
          pulsingTriggerEvent={pulsingTriggerEvent}
          lastTriggerMeta={lastTriggerMeta}
          onClearActiveTrigger={clearActiveTrigger}
          handleTriggerEvent={handleTriggerEvent}
          zones={zones}
          matchPhase={matchPhase}
        />
      </div>

      <BottomNav />

      <OperatorToast message={toast.message} visible={toast.visible} />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 3px rgba(239,68,68,0.3); }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(239,68,68,0.1); }
        }
        @keyframes alertSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes eventBtnPulse {
          0% { filter: brightness(1); }
          40% { filter: brightness(1.15); }
          100% { filter: brightness(1); }
        }
      `}</style>
    </div>
  );
};
