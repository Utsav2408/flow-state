import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { db, ref, set } from '../firebase';
import { startSimulation, triggerEvent, getSimStats } from '../simulation/crowdSimulator';
import { getNashStats } from '../intelligence/routingEngine';
import {
  BASELINE_WAIT,
  BASELINE_COMFORT,
  MAX_ALERTS,
  MATCH_STATES,
  MATCH_STATE_COLORS,
  ZONE_GROUPS,
} from './operatorConstants';
import { densityToComfort, computeAvgWait, computeAvgDensity } from './operatorMetrics';

/**
 * Centralizes simulation and alert logic for the operator dashboard.
 * This keeps the page component focused on layout/composition.
 */
export function useOperatorDashboardState() {
  const zones = useStore((state) => state.zones);
  const stands = useStore((state) => state.stands);
  const simState = useStore((state) => state.simState);
  const storeAlerts = useStore((state) => state.alerts);
  const setSimState = useStore((state) => state.setSimState);
  const nashRoutingEpoch = useStore((state) => state.nashRoutingEpoch);
  const subscribeToAlerts = useStore((state) => state.subscribeToAlerts);

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
  const speedRef = useRef(5);
  const zonesRef = useRef(zones);
  const standsRef = useRef(stands);
  const analyticsSnapshotRef = useRef({
    nashStats: { totalRoutes: 0, nashRerouteCount: 0 },
    standCount: 0,
    avgWaitAll: 0,
    zoneComfortByGroup: {},
    zones: new Map(),
    stands: new Map(),
  });
  const thresholdStateRef = useRef({
    nashActive: false,
    lowComfortByGroup: {},
    highDensityByZone: {},
    highWaitByStand: {},
  });

  const updateSimSpeed = useCallback((nextSpeed) => {
    setSpeed(nextSpeed);
    useStore.getState().setSimState({ speed: nextSpeed });
    if (db) set(ref(db, 'simulation/speed'), nextSpeed).catch(() => {});
  }, []);

  const collectAnalyticsSnapshot = useCallback(() => {
    const latestZones = zonesRef.current;
    const latestStands = standsRef.current;
    const zoneComfortByGroup = {};

    Object.entries(ZONE_GROUPS).forEach(([groupId, aliases]) => {
      let total = 0;
      let count = 0;
      aliases.forEach((zoneName) => {
        const zoneData = latestZones.get(zoneName);
        if (zoneData?.density !== undefined) {
          total += zoneData.density;
          count += 1;
        }
      });
      const density = count > 0 ? Math.round(total / count) : 0;
      zoneComfortByGroup[groupId] = densityToComfort(density);
    });

    return {
      nashStats: getNashStats(),
      standCount: latestStands.size || 4,
      avgWaitAll: computeAvgWait(latestStands),
      zoneComfortByGroup,
      zones: latestZones,
      stands: latestStands,
    };
  }, []);

  const generateAlertsFromSnapshot = useCallback((snapshot) => {
    const newAlerts = [];
    const now = Date.now();
    const prevThresholdState = thresholdStateRef.current;
    const nextThresholdState = {
      nashActive: prevThresholdState.nashActive,
      lowComfortByGroup: { ...prevThresholdState.lowComfortByGroup },
      highDensityByZone: { ...prevThresholdState.highDensityByZone },
      highWaitByStand: { ...prevThresholdState.highWaitByStand },
    };

    const nashActive = snapshot.nashStats.totalRoutes > 0;
    if (nashActive && !prevThresholdState.nashActive) {
      const reduction = Math.max(5, Math.round(100 - (snapshot.avgWaitAll / BASELINE_WAIT) * 100));
      newAlerts.push({
        message: `Nash routing distributed ${snapshot.nashStats.nashRerouteCount.toLocaleString()} fans across ${snapshot.standCount} stands. Avg wait reduced by ${reduction}%.`,
        severity: 'green',
        timestamp: now,
      });
    }
    nextThresholdState.nashActive = nashActive;

    Object.entries(snapshot.zoneComfortByGroup).forEach(([groupId, comfort]) => {
      const lowComfort = comfort < 40;
      const wasLowComfort = Boolean(prevThresholdState.lowComfortByGroup[groupId]);
      if (lowComfort && !wasLowComfort) {
        newAlerts.push({
          message: `Zone ${groupId} comfort dropped to ${comfort}. Suggesting relocation to fans.`,
          severity: 'amber',
          timestamp: now,
        });
      }
      nextThresholdState.lowComfortByGroup[groupId] = lowComfort;
    });

    snapshot.zones.forEach((zone, zoneId) => {
      const highDensity = zone.density > 85;
      const wasHighDensity = Boolean(prevThresholdState.highDensityByZone[zoneId]);
      if (highDensity && !wasHighDensity) {
        newAlerts.push({
          message: `Zone ${zoneId} at ${zone.density}%. High density detected.`,
          severity: 'red',
          timestamp: now,
        });
      }
      nextThresholdState.highDensityByZone[zoneId] = highDensity;
    });

    snapshot.stands.forEach((stand, standId) => {
      const highWait = stand.waitTime > 8;
      const wasHighWait = Boolean(prevThresholdState.highWaitByStand[standId]);
      if (highWait && !wasHighWait) {
        newAlerts.push({
          message: `Stand ${standId} queue rising to ${stand.waitTime}min.`,
          severity: 'amber',
          timestamp: now,
        });
      }
      nextThresholdState.highWaitByStand[standId] = highWait;
    });

    thresholdStateRef.current = nextThresholdState;

    if (newAlerts.length > 0) {
      setGeneratedAlerts((prev) => [...newAlerts, ...prev].slice(0, MAX_ALERTS));
    }
  }, []);

  const showToast = useCallback((message) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast((prev) => ({ ...prev, visible: false })), 2200);
  }, []);

  useEffect(() => {
    startSimulation();
    queueMicrotask(() => updateSimSpeed(5));
  }, [updateSimSpeed]);

  useEffect(() => {
    const unsubscribe = subscribeToAlerts();
    return unsubscribe;
  }, [subscribeToAlerts]);

  useEffect(
    () => () => {
      if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    },
    [],
  );

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);

  useEffect(() => {
    zonesRef.current = zones;
  }, [zones]);

  useEffect(() => {
    standsRef.current = stands;
  }, [stands]);

  useEffect(() => {
    const simInterval = setInterval(() => {
      const simStats = getSimStats();
      setStats(simStats);
      setSimTimeSecs((prev) => prev + 0.1 * speedRef.current);
    }, 100);
    return () => clearInterval(simInterval);
  }, []);

  useEffect(() => {
    const collectAndStoreSnapshot = () => {
      analyticsSnapshotRef.current = collectAnalyticsSnapshot();
    };

    collectAndStoreSnapshot();
    const analyticsInterval = setInterval(collectAndStoreSnapshot, 500);
    return () => clearInterval(analyticsInterval);
  }, [collectAnalyticsSnapshot]);

  useEffect(() => {
    const evaluateAlerts = () => {
      generateAlertsFromSnapshot(analyticsSnapshotRef.current);
    };

    const alertsInterval = setInterval(evaluateAlerts, 1000);
    return () => clearInterval(alertsInterval);
  }, [generateAlertsFromSnapshot]);

  const clearActiveTrigger = useCallback(() => {
    setActiveTriggerEvent(null);
  }, []);

  const handleTriggerEvent = useCallback((eventKey) => {
    triggerEvent(eventKey);
    if (db) set(ref(db, 'simulation/state'), eventKey).catch(() => {});

    const toastLabels = {
      halftime: 'Halftime break triggered',
      goal: 'Goal scored!',
      rain_delay: 'Rain delay activated',
      post_match: 'Final whistle - egress routing',
    };
    const alertLabels = {
      halftime: 'Halftime break triggered. Fan movement surging.',
      goal: 'Goal scored! Celebration movement spike.',
      rain_delay: 'Rain delay - fans seeking cover at stands.',
      post_match: 'Egress plan generated for 38,420 attendees. 4 waves, 4 gates.',
    };

    const now = Date.now();
    setActiveTriggerEvent(eventKey);
    setLastTriggerMeta({ event: eventKey, at: now });
    setPulsingTriggerEvent(eventKey);
    if (pulseTimerRef.current) clearTimeout(pulseTimerRef.current);
    pulseTimerRef.current = setTimeout(() => {
      setPulsingTriggerEvent(null);
      pulseTimerRef.current = null;
    }, 1100);

    showToast(toastLabels[eventKey] || `Event: ${eventKey}`);
    setSimState({
      state: eventKey,
      postMatchElapsedSecs: eventKey === 'post_match' ? 0 : simState?.postMatchElapsedSecs || 0,
    });

    setGeneratedAlerts((prev) =>
      [
        {
          message: alertLabels[eventKey] || `Event: ${eventKey}`,
          severity: eventKey === 'goal' ? 'green' : eventKey === 'post_match' ? 'blue' : 'amber',
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
    const mappedStoreAlerts = storeAlerts.map((alert) => ({
      ...alert,
      severity: alert.severity === 'high' ? 'red' : alert.severity === 'low' ? 'green' : 'amber',
    }));
    return [...generatedAlerts, ...mappedStoreAlerts].slice(0, MAX_ALERTS);
  }, [generatedAlerts, storeAlerts]);

  const nearestWait = useMemo(() => {
    let best = 99;
    stands.forEach((stand) => {
      if (stand.waitTime !== undefined && stand.waitTime < best) best = stand.waitTime;
    });
    return best >= 99 ? 0 : best;
  }, [stands]);

  const crowdLevel = useMemo(() => {
    const sampleZones = ['B4', 'B5', 'B6'];
    let total = 0;
    let count = 0;
    sampleZones.forEach((zoneName) => {
      const zoneData = zones.get(zoneName);
      if (zoneData?.density !== undefined) {
        total += zoneData.density;
        count += 1;
      }
    });
    return count > 0 ? Math.round(total / count) : 0;
  }, [zones]);

  const fanActiveRoutes = useMemo(() => {
    void nashRoutingEpoch;
    const nashStats = getNashStats();
    return nashStats.totalRoutes || 0;
  }, [nashRoutingEpoch]);

  const aiActionTitle = useMemo(() => {
    if (nearestWait < 3) return 'Grab food now - ideal window';
    if (comfortScore < 50) return 'Your zone is getting crowded';
    return "You're in a great spot";
  }, [nearestWait, comfortScore]);

  return {
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
  };
}
