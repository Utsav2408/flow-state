import venueGraph from '../models/venueGraph';

const GATES = ['G1', 'G2', 'G3', 'G4'];
const WAVE_OFFSET_SECONDS = {
  1: 0,
  2: 120,
  3: 240,
  4: 360,
};

const GATE_TO_WAVE = {
  G1: 1,
  G2: 2,
  G3: 3,
  G4: 4,
};

const FAN_ZONE_OVERRIDES = {
  'fan-1': 'B4',
  You: 'B4',
  AK: 'B4',
  RS: 'A2',
  PV: 'B5',
};

const GROUP_GATE_ASSIGNMENTS = {
  You: 'G3',
  AK: 'G3',
  RS: 'G2',
  PV: 'G3',
};

const ROUTE_BY_GATE = {
  G1: 'Northwest concourse lane via ramp A',
  G2: 'North-east tunnel via upper concourse',
  G3: 'South spine via main boulevard',
  G4: 'South-west concourse via ramp D',
};

function estimatePathCost(path) {
  if (!Array.isArray(path) || path.length < 2) return Number.POSITIVE_INFINITY;
  let cost = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const from = path[i];
    const to = path[i + 1];
    const edge = venueGraph.getNeighbors(from).find((n) => n.node === to);
    cost += edge?.distance ?? 20;
  }
  return cost;
}

function normalizeZone(zoneOrGroupId) {
  if (!zoneOrGroupId) return 'B4';
  if (zoneOrGroupId.includes('-')) return zoneOrGroupId.split('-')[0];
  return zoneOrGroupId;
}

function getNearestGateFromZone(zoneId) {
  let bestGate = 'G3';
  let bestCost = Number.POSITIVE_INFINITY;

  for (const gate of GATES) {
    const path = venueGraph.getShortestPath(zoneId, gate);
    const cost = estimatePathCost(path);
    if (cost < bestCost) {
      bestCost = cost;
      bestGate = gate;
    }
  }
  return bestGate;
}

export function getGroupGateAssignments() {
  return GROUP_GATE_ASSIGNMENTS;
}

export function getEgressPlan(fanId, options = {}) {
  const zoneId = normalizeZone(options.zoneId || FAN_ZONE_OVERRIDES[fanId] || 'B4');
  const nearestGate = getNearestGateFromZone(zoneId);

  let gate = nearestGate;
  if (fanId === 'fan-1' || fanId === 'You') {
    gate = 'G3';
  } else if (GROUP_GATE_ASSIGNMENTS[fanId]) {
    gate = GROUP_GATE_ASSIGNMENTS[fanId];
  }

  // Demo requirement: current fan is Wave 2 so UI always gets a visible countdown.
  const wave = fanId === 'fan-1' || fanId === 'You' ? 2 : GATE_TO_WAVE[gate] || 2;
  const departureTime = WAVE_OFFSET_SECONDS[wave] ?? 120;

  return {
    wave,
    departureTime,
    gate,
    route: ROUTE_BY_GATE[gate] || ROUTE_BY_GATE.G3,
    congestionSavings: 78,
  };
}
