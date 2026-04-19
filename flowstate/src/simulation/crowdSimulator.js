import { useStore } from '../store/useStore';
import { db, ref, set } from '../firebase';
import {
  ZONE_TARGETS,
  STAND_LAYOUT,
  GATES_LAYOUT,
  LOGICAL_MAP,
  getDefaultStandCapacity,
} from '../models/venueLayout';

const NUM_FANS = 40000;
const SIM_TICK_MS = 100;

const STANDS = STAND_LAYOUT.map((s) => ({
  id: s.id,
  x: s.x,
  y: s.y,
  queue: [],
}));

const GATES = GATES_LAYOUT.map((g) => ({ id: g.id, x: g.x, y: g.y }));

let fans = [];
let simInterval = null;
let currentPhase = 'live_play';
let simTimeSecs = 0;

function generateFans() {
  const allZones = Object.keys(ZONE_TARGETS);
  fans = Array(NUM_FANS)
    .fill(null)
    .map((_, i) => {
      const startGate = GATES[i % GATES.length];
      const assignedZone = allZones[i % allZones.length];
      return {
        id: `fan_${i}`,
        position: {
          x: startGate.x + (Math.random() * 40 - 20),
          y: startGate.y + (Math.random() * 40 - 20),
        },
        zone: assignedZone,
        state: 'walking',
        destination: getJitteredPosition(ZONE_TARGETS[assignedZone]),
        speed: 0.8 + Math.random() * 0.6,
        standQueue: null,
        waitTicks: 0,
      };
    });
}

function getJitteredPosition(basePos) {
  return {
    x: basePos.x + (Math.random() * 80 - 40),
    y: basePos.y + (Math.random() * 80 - 40),
  };
}

function assignToNearestEntity(fan, entities) {
  let nearest = entities[0];
  let minD = Infinity;
  for (const ent of entities) {
    const d = Math.hypot(ent.x - fan.position.x, ent.y - fan.position.y);
    if (d < minD) {
      minD = d;
      nearest = ent;
    }
  }
  return nearest;
}

function tick() {
  const store = useStore.getState();
  const speedMult = store.simState.speed;
  if (speedMult === 0) return;

  simTimeSecs += (SIM_TICK_MS / 1000) * speedMult;

  STANDS.forEach((stand) => {
    if (stand.queue.length > 0 && Math.random() < 0.05 * speedMult) {
      const fanId = stand.queue.shift();
      const fan = fans[parseInt(fanId.split('_')[1])];
      if (fan) {
        fan.state = 'walking';
        fan.standQueue = null;
        fan.destination = getJitteredPosition(ZONE_TARGETS[fan.zone]);
      }
    }
  });

  const speedScaled = speedMult * 2;

  const isHalftime = currentPhase === 'halftime';
  const isGoal = currentPhase === 'goal';
  const isPostMatch = currentPhase === 'post_match';

  for (let i = 0; i < NUM_FANS; i++) {
    const fan = fans[i];

    if (fan.state === 'seated' && !isHalftime && !isPostMatch && !isGoal) {
      if (Math.random() < 0.00005 * speedMult) {
        fan.state = 'walking';
        const targetStand = STANDS[Math.floor(Math.random() * STANDS.length)];
        fan.destination = getJitteredPosition(targetStand);
        fan.standQueue = targetStand;
      }
    }

    if (fan.state === 'walking' || fan.state === 'exiting') {
      const dx = fan.destination.x - fan.position.x;
      const dy = fan.destination.y - fan.position.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 5) {
        if (fan.state === 'exiting') {
          fan.position.x = fan.destination.x;
          fan.position.y = fan.destination.y;
        } else if (fan.standQueue) {
          fan.state = 'queuing';
          fan.standQueue.queue.push(fan.id);
        } else {
          fan.state = 'seated';
        }
      } else {
        const moveDist = Math.min(fan.speed * speedScaled, dist);
        fan.position.x += (dx / dist) * moveDist;
        fan.position.y += (dy / dist) * moveDist;
      }
    }

    if (isGoal && fan.state === 'seated' && Math.random() < 0.05 * speedMult) {
      fan.state = 'walking';
      fan.destination = getJitteredPosition(ZONE_TARGETS[fan.zone]);
    }
  }

  updateDataStore();
}

function updateDataStore() {
  const store = useStore.getState();
  const capDefault = getDefaultStandCapacity();

  const zoneCounts = {};
  for (let i = 0; i < NUM_FANS; i++) {
    if (fans[i].state === 'seated' || fans[i].state === 'walking') {
      const z = fans[i].zone;
      zoneCounts[z] = (zoneCounts[z] || 0) + 1;
    }
  }

  const updatedZones = new Map(store.zones);
  Object.keys(ZONE_TARGETS).forEach((zId) => {
    const capacity = ZONE_TARGETS[zId].capacity;
    const count = zoneCounts[zId] || 0;
    const density = Math.min(100, Math.floor((count / capacity) * 100));

    const existing = updatedZones.get(zId) || { name: `Zone ${zId}` };
    updatedZones.set(zId, { ...existing, density, capacity });
  });

  store.updateZones(updatedZones);

  if (db && Math.random() < 0.1) {
    const fbZones = Object.fromEntries(updatedZones);
    set(ref(db, 'zones'), fbZones).catch(() => {});
  }

  const updatedStands = new Map(store.stands);
  STANDS.forEach((s) => {
    const raw = Math.ceil(s.queue.length / 5);
    const waitTime = Math.max(1, Math.min(15, raw || 1));
    const existing = updatedStands.get(s.id) || { name: `Food Stand ${s.id}`, queueLen: 0 };
    updatedStands.set(s.id, {
      ...existing,
      waitTime,
      queueLen: s.queue.length,
      capacity: existing.capacity ?? capDefault,
    });
  });
  store.updateStands(updatedStands);

  if (db && Math.random() < 0.1) {
    const fbStands = Object.fromEntries(updatedStands);
    set(ref(db, 'stands'), fbStands).catch(() => {});
  }
}

export function startSimulation() {
  if (!simInterval) {
    if (fans.length === 0) generateFans();
    simInterval = setInterval(tick, SIM_TICK_MS);
  }
}

export function pauseSimulation() {
  if (simInterval) {
    clearInterval(simInterval);
    simInterval = null;
  }
}

export function triggerEvent(event) {
  currentPhase = event;

  if (event === 'halftime') {
    for (let i = 0; i < NUM_FANS; i++) {
      if (Math.random() < 0.4 && fans[i].state === 'seated') {
        fans[i].state = 'walking';
        const targetStand = STANDS[Math.floor(Math.random() * STANDS.length)];
        fans[i].destination = getJitteredPosition(targetStand);
        fans[i].standQueue = targetStand;
      }
    }
  } else if (event === 'goal') {
    setTimeout(() => {
      if (currentPhase === 'goal') currentPhase = 'live_play';
    }, 10000);
  } else if (event === 'rain_delay') {
    for (let i = 0; i < NUM_FANS; i++) {
      if (fans[i].state === 'seated' && Math.random() < 0.3) {
        fans[i].state = 'walking';
        const targetStand = STANDS[Math.floor(Math.random() * STANDS.length)];
        fans[i].destination = getJitteredPosition(targetStand);
        fans[i].standQueue = targetStand;
      }
    }
  } else if (event === 'post_match') {
    for (let i = 0; i < NUM_FANS; i++) {
      fans[i].state = 'exiting';
      fans[i].standQueue = null;
      fans[i].destination = getJitteredPosition(assignToNearestEntity(fans[i], GATES));
    }
  }
}

export function getSimStats() {
  const walkingCount = fans.filter((f) => f.state === 'walking').length;
  const activeCount = fans.filter((f) => f.state !== 'exiting' && f.state !== 'queuing').length;
  const queuingCount = fans.filter((f) => f.state === 'queuing').length;
  return { activeCount, walkingCount, queuingCount, total: NUM_FANS, phase: currentPhase };
}

export function getSimTime() {
  return simTimeSecs;
}

/** Expose logical map size for UI that scales with venue model. */
export function getLogicalMapSize() {
  return { width: LOGICAL_MAP.width, height: LOGICAL_MAP.height };
}

if (import.meta.env.DEV) {
  window.startSim = startSimulation;
  window.triggerSim = triggerEvent;
}
