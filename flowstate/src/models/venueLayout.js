/**
 * Single venue geometry for simulation, canvas rendering, and UI helpers.
 * Logical coordinates match VenueMapCanvas / crowdSimulator (800×800, origin top-left).
 */

import { DEFAULT_STAND_QUEUE_CAP } from '../config/routingConstants';

export const LOGICAL_MAP = {
  width: 800,
  height: 800,
  /** Center of the stadium drawing */
  cx: 400,
  cy: 400,
};

const { cx, cy } = LOGICAL_MAP;

/** Aggregated zones for heatmaps and labels (aliases must match Firebase zone ids). */
export const ZONE_GROUPS = [
  { id: 'A1-A4', x: cx - 220, y: cy - 100, rx: 60, ry: 60, alias: ['A1', 'A2', 'A3', 'A4'] },
  { id: 'B1-B3', x: cx, y: cy - 250, rx: 80, ry: 40, alias: ['B1', 'B2', 'B3'] },
  { id: 'B4-B6', x: cx + 220, y: cy - 100, rx: 70, ry: 50, alias: ['B4', 'B5', 'B6'] },
  { id: 'C1-C3', x: cx + 220, y: cy + 150, rx: 80, ry: 60, alias: ['C1', 'C2', 'C3'] },
  { id: 'C4-C6', x: cx, y: cy + 250, rx: 90, ry: 45, alias: ['C4', 'C5', 'C6'] },
  { id: 'D1-D3', x: cx - 200, y: cy + 150, rx: 70, ry: 60, alias: ['D1', 'D2', 'D3'] },
];

/** Map individual zone id → aggregated group id (for canvas node placement). */
export const ZONE_ID_TO_GROUP_ID = Object.fromEntries(
  ZONE_GROUPS.flatMap((g) => g.alias.map((a) => [a, g.id]))
);

/** Per-seat zone targets for crowd sim (capacity drives density %). */
export const ZONE_TARGETS = {
  A1: { x: cx - 220, y: cy - 100, capacity: 1000 },
  A2: { x: cx - 220, y: cy - 100, capacity: 1000 },
  A3: { x: cx - 220, y: cy - 100, capacity: 1000 },
  A4: { x: cx - 220, y: cy - 100, capacity: 1000 },
  B1: { x: cx, y: cy - 250, capacity: 2000 },
  B2: { x: cx, y: cy - 250, capacity: 2000 },
  B3: { x: cx, y: cy - 250, capacity: 2000 },
  B4: { x: cx + 220, y: cy - 100, capacity: 4200 },
  B5: { x: cx + 220, y: cy - 100, capacity: 4200 },
  B6: { x: cx + 220, y: cy - 100, capacity: 4200 },
  C1: { x: cx + 220, y: cy + 150, capacity: 2000 },
  C2: { x: cx + 220, y: cy + 150, capacity: 2000 },
  C3: { x: cx + 220, y: cy + 150, capacity: 2000 },
  C4: { x: cx, y: cy + 250, capacity: 2000 },
  C5: { x: cx, y: cy + 250, capacity: 2000 },
  C6: { x: cx, y: cy + 250, capacity: 2000 },
  D1: { x: cx - 200, y: cy + 150, capacity: 2000 },
  D2: { x: cx - 200, y: cy + 150, capacity: 2000 },
  D3: { x: cx - 200, y: cy + 150, capacity: 2000 },
};

export const STAND_LAYOUT = [
  { id: 'S1', x: cx - 260, y: cy - 210 },
  { id: 'S2', x: cx - 260, y: cy - 130 },
  { id: 'S3', x: cx - 110, y: cy - 170 },
  { id: 'S4', x: cx + 40, y: cy - 260 },
  { id: 'S5', x: cx - 150, y: cy + 30 },
  { id: 'S6', x: cx - 200, y: cy + 120 },
  { id: 'S7', x: cx + 140, y: cy - 170 },
  { id: 'S8', x: cx + 200, y: cy - 100 },
  { id: 'S9', x: cx + 200, y: cy + 80 },
  { id: 'S10', x: cx + 40, y: cy + 260 },
  { id: 'S11', x: cx - 40, y: cy + 260 },
  { id: 'S12', x: cx + 155, y: cy + 40 },
];

export const GATES_LAYOUT = [
  { id: 'G1', x: cx - 300, y: cy - 300, shortLabel: 'NW' },
  { id: 'G2', x: cx + 300, y: cy - 300, shortLabel: 'NE' },
  { id: 'G3', x: cx + 300, y: cy + 300, shortLabel: 'SE' },
  { id: 'G4', x: cx - 300, y: cy + 300, shortLabel: 'SW' },
];

/** Approximate map positions for routing polylines (matches graph.incident zones). */
export const RESTROOM_LAYOUT = [
  { id: 'R1', x: cx - 280, y: cy - 120 },
  { id: 'R2', x: cx - 40, y: cy - 200 },
  { id: 'R3', x: cx + 180, y: cy - 40 },
  { id: 'R4', x: cx + 160, y: cy + 80 },
  { id: 'R5', x: cx + 40, y: cy + 200 },
  { id: 'R6', x: cx - 240, y: cy + 120 },
  { id: 'R7', x: cx - 240, y: cy + 200 },
  { id: 'R8', x: cx + 80, y: cy + 220 },
];

export const GATE_BY_ID = Object.fromEntries(GATES_LAYOUT.map((g) => [g.id, g]));

/**
 * Canvas / map position for a routing graph node id.
 */
export function getNodeCanvasPos(nodeId) {
  if (!nodeId) return null;

  const zg = ZONE_ID_TO_GROUP_ID[nodeId];
  if (zg) {
    const zl = ZONE_GROUPS.find((z) => z.id === zg);
    if (zl) return { x: zl.x, y: zl.y };
  }

  const stand = STAND_LAYOUT.find((s) => s.id === nodeId);
  if (stand) return { x: stand.x, y: stand.y };

  const gate = GATES_LAYOUT.find((g) => g.id === nodeId);
  if (gate) return { x: gate.x, y: gate.y };

  const rr = RESTROOM_LAYOUT.find((r) => r.id === nodeId);
  if (rr) return { x: rr.x, y: rr.y };

  return null;
}

/** Zone group string (e.g. B4-B6) → list of Firebase zone ids. */
export function getZoneAliasesForGroup(groupId) {
  const g = ZONE_GROUPS.find((z) => z.id === groupId);
  return g ? g.alias : [];
}

/**
 * Closest food stand id to a point by map distance; uses live `stands` wait when available.
 */
export function getClosestStandToPoint(standsMap, x, y, fallbackStandId = 'S12') {
  let closest = null;
  let minD = Infinity;

  for (const st of STAND_LAYOUT) {
    const d = Math.hypot(st.x - x, st.y - y);
    if (d < minD) {
      minD = d;
      closest = st;
    }
  }

  if (!closest) {
    const w = standsMap?.get?.(fallbackStandId)?.waitTime ?? 5;
    return { id: fallbackStandId, waitTime: w, distance: 0 };
  }

  const w = standsMap?.get?.(closest.id)?.waitTime ?? 5;
  return { id: closest.id, waitTime: w, distance: minD };
}

/** Meters-ish from abstract path cost (tuned for UI, not physical survey). */
export function estimateWalkMetersFromPathCost(pathCost) {
  if (pathCost == null || Number.isNaN(pathCost)) return null;
  return Math.max(20, Math.round(Number(pathCost) * 2.2));
}

export function getDefaultStandCapacity() {
  return DEFAULT_STAND_QUEUE_CAP;
}
