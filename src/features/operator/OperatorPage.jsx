import React, { useEffect, useRef } from 'react';
import { BottomNav } from '../../components/ui/BottomNav';
import { OperatorToast } from './OperatorDashboardWidgets';
import {
  OperatorDashboardHeader,
  OperatorDashboardLeftColumn,
  OperatorDashboardRightColumn,
} from './OperatorDashboardPanels';
import { useOperatorDashboardState } from './useOperatorDashboardState';
import { usePrefersReducedMotion } from '../../utils/usePrefersReducedMotion';

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
  const prevComfortRef = useRef(comfortScore);
  const prevAlertCountRef = useRef(allAlerts.length);
  const prefersReducedMotion = usePrefersReducedMotion();
  const liveRegionRef = useRef(null);

  useEffect(() => {
    if (allAlerts.length > prevAlertCountRef.current) {
      const newestAlert = allAlerts[0];
      if (newestAlert?.message && liveRegionRef.current) {
        liveRegionRef.current.textContent = `New alert: ${newestAlert.message}`;
      }
      prevAlertCountRef.current = allAlerts.length;
    }
  }, [allAlerts]);

  useEffect(() => {
    if (Math.abs(comfortScore - prevComfortRef.current) >= 5) {
      if (liveRegionRef.current) {
        liveRegionRef.current.textContent = `Venue comfort average updated to ${comfortScore}.`;
      }
      prevComfortRef.current = comfortScore;
    }
  }, [comfortScore]);

  return (
    <div className="flex h-screen max-h-screen flex-col overflow-hidden bg-slate-100 font-sans">
      <OperatorDashboardHeader
        simTimeSecs={simTimeSecs}
        matchLabel={matchLabel}
        matchColor={matchColor}
      />

      <main id="main-content" className="grid min-h-0 flex-1 grid-cols-[1fr_240px]" aria-label="Operator dashboard content">
        <h1 data-page-heading className="sr-only">
          Operator Dashboard
        </h1>
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
        <p ref={liveRegionRef} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      </main>

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
      {prefersReducedMotion ? (
        <style>{`
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        `}</style>
      ) : null}
    </div>
  );
};
