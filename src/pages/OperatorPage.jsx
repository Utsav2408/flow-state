import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { db, ref, set } from '../firebase';
import { startSimulation, triggerEvent, getSimStats } from '../simulation/crowdSimulator';
import { getNashStats } from '../intelligence/routingEngine';
import { BottomNav } from '../components/Shared';
import { OperatorToast } from '../operator/OperatorDashboardWidgets';
import {
  OperatorDashboardHeader,
  OperatorDashboardLeftColumn,
  OperatorDashboardRightColumn,
} from '../operator/OperatorDashboardPanels';
import {
  BASELINE_WAIT,
  BASELINE_COMFORT,
  MAX_ALERTS,
  MATCH_STATES,
  MATCH_STATE_COLORS,
  ZONE_GROUPS,
} from '../operator/operatorConstants';
import {
  densityToComfort,
  computeAvgWait,
  computeAvgDensity,
} from '../operator/operatorMetrics';

export const OperatorPage = () => {
  const zones = useStore((state) => state.zones);
  const stands = useStore((state) => state.stands);
  const simState = useStore((state) => state.simState);
  const storeAlerts = useStore((state) => state.alerts);
  const setSimState = useStore((state) => state.setSimState);
  const nashRoutingEpoch = useStore((state) => state.nashRoutingEpoch);

  const [simTimeSecs, setSimTimeSecs] = useState(0);
  const [stats, setStats] = useState({
    activeCount: 0,
    queuingCount: 0,
    total: 40000,
    phase: 'live_play',
  });
  const [speed, setSpeed] = useState(5);
  const [generatedAlerts, setGeneratedAlerts] = useState([]);
  const [toast, setToast] = useState({ message: '', visible: false });
  const [activeTriggerEvent, setActiveTriggerEvent] = useState(null);
  const [pulsingTriggerEvent, setPulsingTriggerEvent] = useState(null);
  const [lastTriggerMeta, setLastTriggerMeta] = useState(null);
  const pulseTimerRef = useRef(null);
  const prevAvgWaitRef = useRef(null);
  const nashAlertCooldownRef = useRef(0);
  const comfortAlertCooldownRef = useRef({});
  const highDensityCooldownRef = useRef({});
  const standWaitCooldownRef = useRef({});

  const updateSimSpeed = useCallback((spd) => {
    setSpeed(spd);
    useStore.getState().setSimState({ speed: spd });
    if (db) set(ref(db, 'simulation/speed'), spd).catch(() => {});
  }, []);

  const generateAlerts = useCallback(() => {
    const newAlerts = [];
    const now = Date.now();

    const nashStats = getNashStats();
    if (nashStats.totalRoutes > 0 && now - nashAlertCooldownRef.current > 15000) {
      const standCount = stands.size || 4;
      const avgWaitAll = computeAvgWait(stands);
      const reduction = Math.max(5, Math.round(100 - (avgWaitAll / BASELINE_WAIT) * 100));
      newAlerts.push({
        message: `Nash routing distributed ${nashStats.nashRerouteCount.toLocaleString()} fans across ${standCount} stands. Avg wait reduced by ${reduction}%.`,
        severity: 'green',
        timestamp: now,
      });
      nashAlertCooldownRef.current = now;
    }

    Object.entries(ZONE_GROUPS).forEach(([groupId, aliases]) => {
      let total = 0;
      let count = 0;
      aliases.forEach((z) => {
        const d = zones.get(z);
        if (d?.density !== undefined) {
          total += d.density;
          count++;
        }
      });
      const density = count > 0 ? Math.round(total / count) : 0;
      const comfort = densityToComfort(density);

      const lastAlert = comfortAlertCooldownRef.current[groupId] || 0;
      if (comfort < 40 && now - lastAlert > 20000) {
        newAlerts.push({
          message: `Zone ${groupId} comfort dropped to ${comfort}. Suggesting relocation to fans.`,
          severity: 'amber',
          timestamp: now,
        });
        comfortAlertCooldownRef.current[groupId] = now;
      }
    });

    zones.forEach((zone, zoneId) => {
      if (zone.density > 85) {
        const last = highDensityCooldownRef.current[zoneId] || 0;
        if (now - last > 25000) {
          newAlerts.push({
            message: `Zone ${zoneId} at ${zone.density}%. High density detected.`,
            severity: 'red',
            timestamp: now,
          });
          highDensityCooldownRef.current[zoneId] = now;
        }
      }
    });

    stands.forEach((stand, standId) => {
      if (stand.waitTime > 8) {
        const last = standWaitCooldownRef.current[standId] || 0;
        if (now - last > 25000) {
          newAlerts.push({
            message: `Stand ${standId} queue rising to ${stand.waitTime}min.`,
            severity: 'amber',
            timestamp: now,
          });
          standWaitCooldownRef.current[standId] = now;
        }
      }
    });

    const avgWaitAll = computeAvgWait(stands);
    if (prevAvgWaitRef.current !== null && avgWaitAll < prevAvgWaitRef.current) {
      const pct = Math.round(
        ((prevAvgWaitRef.current - avgWaitAll) / prevAvgWaitRef.current) * 100,
      );
      if (pct > 3) {
        newAlerts.push({
          message: `Avg wait reduced by ${pct}% this session.`,
          severity: 'green',
          timestamp: now,
        });
      }
    }
    prevAvgWaitRef.current = avgWaitAll;

    if (newAlerts.length > 0) {
      setGeneratedAlerts((prev) => {
        const combined = [...newAlerts, ...prev].slice(0, MAX_ALERTS);
        return combined;
      });
    }
  }, [zones, stands]);

  const showToast = useCallback((msg) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2200);
  }, []);

  const subscribeToAlerts = useStore((state) => state.subscribeToAlerts);

  useEffect(() => {
    startSimulation();
    queueMicrotask(() => updateSimSpeed(5));
  }, [updateSimSpeed]);

  useEffect(() => {
    const unsub = subscribeToAlerts();
    return unsub;
  }, [subscribeToAlerts]);

  useEffect(
    () => () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const s = getSimStats();
      setStats(s);
      setSimTimeSecs((prev) => prev + 0.1 * speed);
      generateAlerts();
    }, 100);
    return () => clearInterval(interval);
  }, [speed, generateAlerts]);

  const clearActiveTrigger = useCallback(() => {
    setActiveTriggerEvent(null);
  }, []);

  const handleTriggerEvent = useCallback((event) => {
    triggerEvent(event);
    if (db) {
      set(ref(db, 'simulation/state'), event).catch(() => {});
    }
    const labels = {
      halftime: 'Halftime break triggered',
      goal: 'Goal scored!',
      rain_delay: 'Rain delay activated',
      post_match: 'Final whistle — egress routing',
    };
    const alertLabels = {
      halftime: 'Halftime break triggered. Fan movement surging.',
      goal: 'Goal scored! Celebration movement spike.',
      rain_delay: 'Rain delay — fans seeking cover at stands.',
      post_match: 'Egress plan generated for 38,420 attendees. 4 waves, 4 gates.',
    };

    const now = Date.now();
    setActiveTriggerEvent(event);
    setLastTriggerMeta({ event, at: now });
    setPulsingTriggerEvent(event);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      setPulsingTriggerEvent(null);
      pulseTimerRef.current = null;
    }, 1100);

    showToast(labels[event] || `Event: ${event}`);
    setSimState({
      state: event,
      postMatchElapsedSecs: event === 'post_match' ? 0 : simState?.postMatchElapsedSecs || 0,
    });

    setGeneratedAlerts((prev) =>
      [
        {
          message: alertLabels[event] || `Event: ${event}`,
          severity:
            event === 'goal' ? 'green' : event === 'post_match' ? 'blue' : 'amber',
          timestamp: now,
        },
        ...prev,
      ].slice(0, MAX_ALERTS),
    );
  }, [setSimState, showToast, simState?.postMatchElapsedSecs]);

  const fanCount = stats.total;
  const capacity = 40000;
  const capPct = Math.round((fanCount / capacity) * 100);

  const avgWait = computeAvgWait(stands);
  const waitDelta = avgWait - BASELINE_WAIT;
  const waitDeltaLabel =
    waitDelta >= 0 ? `+${waitDelta.toFixed(1)}m vs baseline` : `${waitDelta.toFixed(1)}m vs baseline`;

  const walkingCount = stats.activeCount;
  const activeRoutes = Math.floor(walkingCount * 0.7);

  const avgDensity = computeAvgDensity(zones);
  const comfortScore = densityToComfort(avgDensity);
  const comfortDelta = comfortScore - BASELINE_COMFORT;
  const comfortDeltaLabel =
    comfortDelta >= 0 ? `+${comfortDelta} vs baseline` : `${comfortDelta} vs baseline`;

  const matchPhase = stats.phase || simState.state || 'live_play';
  const matchLabel = MATCH_STATES[matchPhase] || 'Live';
  const matchColor = MATCH_STATE_COLORS[matchPhase] || '#22c55e';
  const departedPct = Math.round((Math.max(0, stats.exitedCount || 0) / Math.max(1, stats.total || 1)) * 100);

  const allAlerts = useMemo(() => {
    const fromStore = storeAlerts.map((a) => ({
      ...a,
      severity: a.severity === 'high' ? 'red' : a.severity === 'low' ? 'green' : 'amber',
    }));
    return [...generatedAlerts, ...fromStore].slice(0, MAX_ALERTS);
  }, [generatedAlerts, storeAlerts]);

  const nearestWait = useMemo(() => {
    let best = 99;
    stands.forEach((s) => {
      if (s.waitTime !== undefined && s.waitTime < best) best = s.waitTime;
    });
    return best >= 99 ? 0 : best;
  }, [stands]);

  const crowdLevel = useMemo(() => {
    const group = ['B4', 'B5', 'B6'];
    let total = 0;
    let cnt = 0;
    group.forEach((z) => {
      const d = zones.get(z);
      if (d?.density !== undefined) {
        total += d.density;
        cnt++;
      }
    });
    return cnt > 0 ? Math.round(total / cnt) : 0;
  }, [zones]);

  const fanActiveRoutes = useMemo(() => {
    void nashRoutingEpoch;
    const ns = getNashStats();
    return ns.totalRoutes || 0;
  }, [nashRoutingEpoch]);

  const aiActionTitle = useMemo(() => {
    if (nearestWait < 3) return 'Grab food now — ideal window';
    if (comfortScore < 50) return 'Your zone is getting crowded';
    return "You're in a great spot";
  }, [nearestWait, comfortScore]);

  return (
    <div
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#F1F5F9',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <OperatorDashboardHeader
        simTimeSecs={simTimeSecs}
        matchLabel={matchLabel}
        matchColor={matchColor}
      />

      <div
        style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: '1fr 240px',
          gap: 0,
          minHeight: 0,
        }}
      >
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
