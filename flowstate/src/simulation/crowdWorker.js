// Web Worker for crowd simulation
import {
  ZONE_TARGETS,
  STAND_LAYOUT,
  GATES_LAYOUT,
  projectOutsideInnerGroundCircle,
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
let speedMult = 1;

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
      };
    });
}

function getJitteredPosition(basePos) {
  const raw = {
    x: basePos.x + (Math.random() * 80 - 40),
    y: basePos.y + (Math.random() * 80 - 40),
  };
  return projectOutsideInnerGroundCircle(raw.x, raw.y);
}

function assignToNearestGate(fan) {
  let nearest = GATES[0];
  let minD = Infinity;
  for (const gate of GATES) {
    const d = Math.hypot(gate.x - fan.position.x, gate.y - fan.position.y);
    if (d < minD) {
      minD = d;
      nearest = gate;
    }
  }
  return nearest;
}

function tick() {
  if (speedMult === 0) return;

  simTimeSecs += (SIM_TICK_MS / 1000) * speedMult;

  STANDS.forEach((stand) => {
    if (stand.queue.length > 0 && Math.random() < 0.05 * speedMult) {
      const fanId = stand.queue.shift();
      const fanIdx = parseInt(fanId.split('_')[1], 10);
      const fan = fans[fanIdx];
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

  const zoneCounts = {};
  let walkingCount = 0;
  let activeCount = 0;
  let queuingCount = 0;

  for (let i = 0; i < NUM_FANS; i++) {
    const s = fans[i].state;
    if (s === 'walking') walkingCount++;
    if (s === 'queuing') queuingCount++;
    if (s !== 'exiting' && s !== 'queuing') activeCount++;
    if (s === 'seated' || s === 'walking') {
      const z = fans[i].zone;
      zoneCounts[z] = (zoneCounts[z] || 0) + 1;
    }
  }

  const standData = STANDS.map(s => ({ id: s.id, qLen: s.queue.length }));

  postMessage({
    type: 'tick',
    payload: {
      zoneCounts,
      standData,
      stats: { activeCount, walkingCount, queuingCount, total: NUM_FANS, phase: currentPhase },
      simTimeSecs,
    }
  });
}

self.onmessage = (e) => {
  const { type, payload } = e.data;
  switch (type) {
    case 'START':
      if (!simInterval) {
        if (fans.length === 0) generateFans();
        simInterval = setInterval(tick, SIM_TICK_MS);
      }
      break;
    case 'PAUSE':
      if (simInterval) {
        clearInterval(simInterval);
        simInterval = null;
      }
      break;
    case 'SET_SPEED':
      speedMult = payload;
      break;
    case 'TRIGGER_EVENT':
      currentPhase = payload;
      if (payload === 'halftime') {
        for (let i = 0; i < NUM_FANS; i++) {
          if (Math.random() < 0.4 && fans[i].state === 'seated') {
            fans[i].state = 'walking';
            const targetStand = STANDS[Math.floor(Math.random() * STANDS.length)];
            fans[i].destination = getJitteredPosition(targetStand);
            fans[i].standQueue = targetStand;
          }
        }
      } else if (payload === 'goal') {
        setTimeout(() => {
          if (currentPhase === 'goal') currentPhase = 'live_play';
        }, 10000);
      } else if (payload === 'rain_delay') {
        for (let i = 0; i < NUM_FANS; i++) {
          if (fans[i].state === 'seated' && Math.random() < 0.3) {
            fans[i].state = 'walking';
            const targetStand = STANDS[Math.floor(Math.random() * STANDS.length)];
            fans[i].destination = getJitteredPosition(targetStand);
            fans[i].standQueue = targetStand;
          }
        }
      } else if (payload === 'post_match') {
        for (let i = 0; i < NUM_FANS; i++) {
          fans[i].state = 'exiting';
          fans[i].standQueue = null;
          fans[i].destination = getJitteredPosition(assignToNearestGate(fans[i]));
        }
      }
      break;
  }
};
