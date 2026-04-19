import { useStore } from '../store/useStore';
import { db, ref, set } from '../firebase';

const NUM_FANS = 40000;
const SIM_TICK_MS = 100;
const cx = 400, cy = 400;

const ZONE_TARGETS = {
  'A1': { x: cx - 220, y: cy - 100, capacity: 1000 },
  'A2': { x: cx - 220, y: cy - 100, capacity: 1000 },
  'A3': { x: cx - 220, y: cy - 100, capacity: 1000 },
  'A4': { x: cx - 220, y: cy - 100, capacity: 1000 },
  'B1': { x: cx, y: cy - 250, capacity: 2000 },
  'B2': { x: cx, y: cy - 250, capacity: 2000 },
  'B3': { x: cx, y: cy - 250, capacity: 2000 },
  // Higher nominal capacity so equal fan assignment yields ~45–55% occupancy (demo-friendly comfort).
  'B4': { x: cx + 220, y: cy - 100, capacity: 4200 },
  'B5': { x: cx + 220, y: cy - 100, capacity: 4200 },
  'B6': { x: cx + 220, y: cy - 100, capacity: 4200 },
  'C1': { x: cx + 220, y: cy + 150, capacity: 2000 },
  'C2': { x: cx + 220, y: cy + 150, capacity: 2000 },
  'C3': { x: cx + 220, y: cy + 150, capacity: 2000 },
  'C4': { x: cx, y: cy + 250, capacity: 2000 },
  'C5': { x: cx, y: cy + 250, capacity: 2000 },
  'C6': { x: cx, y: cy + 250, capacity: 2000 },
  'D1': { x: cx - 200, y: cy + 150, capacity: 2000 },
  'D2': { x: cx - 200, y: cy + 150, capacity: 2000 },
  'D3': { x: cx - 200, y: cy + 150, capacity: 2000 },
};

// All S1–S12 so RTDB `/stands/{id}/waitTime` stays in sync with the routing graph for the fan app.
const STANDS = [
  { id: 'S1', x: cx - 260, y: cy - 210, queue: [] },
  { id: 'S2', x: cx - 260, y: cy - 130, queue: [] },
  { id: 'S3', x: cx - 110, y: cy - 170, queue: [] },
  { id: 'S4', x: cx + 40, y: cy - 260, queue: [] },
  { id: 'S5', x: cx - 150, y: cy + 30, queue: [] },
  { id: 'S6', x: cx - 200, y: cy + 120, queue: [] },
  { id: 'S7', x: cx + 140, y: cy - 170, queue: [] },
  { id: 'S8', x: cx + 200, y: cy - 100, queue: [] },
  { id: 'S9', x: cx + 200, y: cy + 80, queue: [] },
  { id: 'S10', x: cx + 40, y: cy + 260, queue: [] },
  { id: 'S11', x: cx - 40, y: cy + 260, queue: [] },
  { id: 'S12', x: cx + 155, y: cy + 40, queue: [] },
];

const GATES = [
  { id: 'G1', x: cx - 300, y: cy - 300 },
  { id: 'G2', x: cx + 300, y: cy - 300 },
  { id: 'G3', x: cx + 300, y: cy + 300 },
  { id: 'G4', x: cx - 300, y: cy + 300 },
];

let fans = [];
let simInterval = null;
let currentPhase = "live_play"; // pre_match, live_play, halftime, post_match
let simTimeSecs = 0;

function generateFans() {
  const allZones = Object.keys(ZONE_TARGETS);
  fans = Array(NUM_FANS).fill(null).map((_, i) => {
    const startGate = GATES[i % GATES.length];
    const assignedZone = allZones[i % allZones.length];
    return {
      id: `fan_${i}`,
      position: { x: startGate.x + (Math.random()*40-20), y: startGate.y + (Math.random()*40-20) },
      zone: assignedZone,
      state: "walking", // Initial state
      destination: getJitteredPosition(ZONE_TARGETS[assignedZone]),
      speed: 0.8 + Math.random() * 0.6, // 0.8 to 1.4
      standQueue: null,
      waitTicks: 0
    };
  });
}

function getJitteredPosition(basePos) {
  return {
    x: basePos.x + (Math.random() * 80 - 40),
    y: basePos.y + (Math.random() * 80 - 40)
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

  // Process queues for stands
  STANDS.forEach(stand => {
    // Service 1 person every ~3 seconds base
    if (stand.queue.length > 0 && Math.random() < 0.05 * speedMult) {
      const fanId = stand.queue.shift();
      const fan = fans[parseInt(fanId.split('_')[1])];
      if (fan) {
        fan.state = "walking";
        fan.standQueue = null;
        fan.destination = getJitteredPosition(ZONE_TARGETS[fan.zone]); // Go back to seat
      }
    }
  });

  const speedScaled = speedMult * 2; // pixel speed per tick
  
  // Phase triggers based on sim logic
  const isHalftime = currentPhase === 'halftime';
  const isGoal = currentPhase === 'goal';
  const isPostMatch = currentPhase === 'post_match';

  for (let i=0; i<NUM_FANS; i++) {
    const fan = fans[i];
    
    // Live behaviors
    if (fan.state === "seated" && !isHalftime && !isPostMatch && !isGoal) {
      // 2-5% chance to get up every 5 mins. So ~0.0001 per tick per fan
      if (Math.random() < 0.00005 * speedMult) {
        fan.state = "walking";
        const targetStand = STANDS[Math.floor(Math.random() * STANDS.length)];
        fan.destination = getJitteredPosition(targetStand);
        fan.standQueue = targetStand;
      }
    }

    if (fan.state === "walking" || fan.state === "exiting") {
      const dx = fan.destination.x - fan.position.x;
      const dy = fan.destination.y - fan.position.y;
      const dist = Math.hypot(dx, dy);

      if (dist < 5) {
        if (fan.state === "exiting") {
          // Despawn or stand still at gate
          fan.position.x = fan.destination.x;
          fan.position.y = fan.destination.y;
        } else if (fan.standQueue) {
          fan.state = "queuing";
          fan.standQueue.queue.push(fan.id);
        } else {
          fan.state = "seated";
        }
      } else {
        const moveDist = Math.min(fan.speed * speedScaled, dist);
        fan.position.x += (dx / dist) * moveDist;
        fan.position.y += (dy / dist) * moveDist;
      }
    }
    
    if (isGoal && fan.state === "seated" && Math.random() < 0.05 * speedMult) {
        fan.state = "walking";
        fan.destination = getJitteredPosition(ZONE_TARGETS[fan.zone]); // Wiggle around
    }
  }

  updateDataStore();
}

function updateDataStore() {
  const store = useStore.getState();
  
  // Density per zone
  const zoneCounts = {};
  for(let i=0; i<NUM_FANS; i++) {
      if(fans[i].state === "seated" || fans[i].state === "walking") {
          const z = fans[i].zone;
          zoneCounts[z] = (zoneCounts[z] || 0) + 1;
      }
  }

  const updatedZones = new Map(store.zones);
  Object.keys(ZONE_TARGETS).forEach(zId => {
      const capacity = ZONE_TARGETS[zId].capacity;
      const count = zoneCounts[zId] || 0;
      const density = Math.min(100, Math.floor((count / capacity) * 100));
      
      const existing = updatedZones.get(zId) || { name: `Zone ${zId}` };
      updatedZones.set(zId, { ...existing, density, capacity });
  });

  store.updateZones(updatedZones);

  // Set Firebase occasionally to avoid hammering DB
  if (db && Math.random() < 0.1) {
      const fbZones = Object.fromEntries(updatedZones);
      set(ref(db, 'zones'), fbZones).catch(() => {});
  }

  // Update Stands
  const updatedStands = new Map(store.stands);
  STANDS.forEach(s => {
      // 5 persons/min service → wait scales with queue; clamp to 1–15 min for readable fan UI.
      const raw = Math.ceil(s.queue.length / 5);
      const waitTime = Math.max(1, Math.min(15, raw || 1));
      const existing = updatedStands.get(s.id) || { name: `Food Stand ${s.id}`, queueLen: 0 };
      updatedStands.set(s.id, { ...existing, waitTime, queueLen: s.queue.length });
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
  
  if (event === "halftime") {
    // 40% get up
    for (let i=0; i<NUM_FANS; i++) {
      if (Math.random() < 0.4 && fans[i].state === "seated") {
        fans[i].state = "walking";
        // 60% food, 25% restroom, 15% wander (simplifying to just random stand for now)
        const targetStand = STANDS[Math.floor(Math.random() * STANDS.length)];
        fans[i].destination = getJitteredPosition(targetStand);
        fans[i].standQueue = targetStand;
      }
    }
  } else if (event === "goal") {
    // Done in tick dynamically
    setTimeout(() => { if(currentPhase === "goal") currentPhase = "live_play"; }, 10000);
  } else if (event === "rain_delay") {
    // 30% of seated fans head to nearest stand for shelter
    for (let i = 0; i < NUM_FANS; i++) {
      if (fans[i].state === 'seated' && Math.random() < 0.3) {
        fans[i].state = 'walking';
        const targetStand = STANDS[Math.floor(Math.random() * STANDS.length)];
        fans[i].destination = getJitteredPosition(targetStand);
        fans[i].standQueue = targetStand;
      }
    }
  } else if (event === "post_match") {
    for (let i=0; i<NUM_FANS; i++) {
        fans[i].state = "exiting";
        fans[i].standQueue = null;
        fans[i].destination = getJitteredPosition(assignToNearestEntity(fans[i], GATES));
    }
  }
}

export function getSimStats() {
  const walkingCount = fans.filter(f => f.state === 'walking').length;
  const activeCount = fans.filter(f => f.state !== 'exiting' && f.state !== 'queuing').length;
  const queuingCount = fans.filter(f => f.state === 'queuing').length;
  return { activeCount, walkingCount, queuingCount, total: NUM_FANS, phase: currentPhase };
}

export function getSimTime() {
  return simTimeSecs;
}

if (import.meta.env.DEV) {
  window.startSim = startSimulation;
  window.triggerSim = triggerEvent;
}
