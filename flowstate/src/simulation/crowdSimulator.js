import { useStore } from '../store/useStore';
import { db, ref, update } from '../firebase';
import { ZONE_TARGETS, LOGICAL_MAP, getDefaultStandCapacity } from '../models/venueLayout';

const NUM_FANS = 40000;
let worker = null;

let cachedStats = { activeCount: 0, walkingCount: 0, queuingCount: 0, total: NUM_FANS, phase: 'live_play' };
let simTimeSecs = 0;

let lastFbWrite = 0;

function handleWorkerMessage(e) {
  const { type, payload } = e.data;
  if (type === 'tick') {
    cachedStats = payload.stats;
    simTimeSecs = payload.simTimeSecs;
    updateDataStore(payload.zoneCounts, payload.standData);
  }
}

function updateDataStore(zoneCounts, standDataList) {
  const store = useStore.getState();
  const capDefault = getDefaultStandCapacity();

  const updatedZones = new Map(store.zones);
  let zonesChanged = false;

  Object.keys(ZONE_TARGETS).forEach((zId) => {
    const capacity = ZONE_TARGETS[zId].capacity;
    const count = zoneCounts[zId] || 0;
    const density = Math.min(100, Math.floor((count / capacity) * 100));

    const existing = updatedZones.get(zId) || { name: `Zone ${zId}` };
    if (existing.density !== density || existing.capacity !== capacity) {
      updatedZones.set(zId, { ...existing, density, capacity });
      zonesChanged = true;
    }
  });

  if (zonesChanged) {
    store.updateZones(updatedZones);
  }

  const updatedStands = new Map(store.stands);
  let standsChanged = false;

  standDataList.forEach((s) => {
    const raw = Math.ceil(s.qLen / 5);
    const waitTime = Math.max(1, Math.min(15, raw || 1));
    const existing = updatedStands.get(s.id) || { name: `Food Stand ${s.id}`, queueLen: 0 };
    
    if (existing.waitTime !== waitTime || existing.queueLen !== s.qLen || existing.capacity !== (existing.capacity ?? capDefault)) {
      updatedStands.set(s.id, {
        ...existing,
        waitTime,
        queueLen: s.qLen,
        capacity: existing.capacity ?? capDefault,
      });
      standsChanged = true;
    }
  });

  if (standsChanged) {
    store.updateStands(updatedStands);
  }

  if (db && Date.now() - lastFbWrite > 5000) {
    lastFbWrite = Date.now();
    update(ref(db), {
      zones: Object.fromEntries(updatedZones),
      stands: Object.fromEntries(updatedStands)
    }).catch(() => {});
  }
}

export function startSimulation() {
  if (!worker) {
    worker = new Worker(new URL('./crowdWorker.js', import.meta.url), { type: 'module' });
    worker.onmessage = handleWorkerMessage;
    
    // Subscribe to speed changes
    useStore.subscribe((state, prevState) => {
      if (state.simState?.speed !== prevState?.simState?.speed) {
        setSimSpeed(state.simState.speed);
      }
    });
  }
  worker.postMessage({ type: 'START' });
}

export function pauseSimulation() {
  if (worker) {
    worker.postMessage({ type: 'PAUSE' });
  }
}

export function setSimSpeed(speedMult) {
  if (worker) {
    worker.postMessage({ type: 'SET_SPEED', payload: speedMult });
  }
}

export function triggerEvent(event) {
  if (worker) {
    worker.postMessage({ type: 'TRIGGER_EVENT', payload: event });
  }
}

export function getSimStats() {
  return cachedStats;
}

export function getSimTime() {
  return simTimeSecs;
}

export function getLogicalMapSize() {
  return { width: LOGICAL_MAP.width, height: LOGICAL_MAP.height };
}

/* @__PURE__ */
if (import.meta.env.DEV) {
  window.startSim = startSimulation;
  window.triggerSim = triggerEvent;
}
