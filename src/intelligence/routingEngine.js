import graph from '../models/venueGraph';
import { useStore } from '../store/useStore';
import {
  CONGESTION_LOAD_SQ_COEFF,
  EDGE_LOAD_INCREMENT,
  NASH_BATCH_MS,
  DEFAULT_STAND_QUEUE_CAP,
  DEFAULT_FAN_GRAPH_ZONE,
  REROUTE_DISPLAY_BASE,
  REROUTE_DISPLAY_PER_CONFLICT,
  REROUTE_DISPLAY_PER_REQ,
} from '../config/routingConstants';
import { dijkstra as runDijkstra } from './dijkstra';

// ── Batch state ──────────────────────────────────────────────────────────
let routeRequestBatch = [];
let batchTimer = null;
let nashStats = { totalRoutes: 0, nashRerouteCount: 0, lastBatchSize: 0 };

/**
 * Ephemeral edge-load overlay keyed by "node1|node2" (canonical order).
 * Tracks load increments accumulated during the current Nash batch ONLY;
 * it is never written back to the shared graph singleton, keeping simulation
 * state isolated from the data model. Call resetEdgeLoads() between ticks
 * or test runs to start fresh.
 */
const edgeLoadOverlay = new Map();

/** Canonical key for an undirected edge (smaller id first). */
function edgeKey(a, b) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Return the current ephemeral load for an edge (falls back to graph value). */
function getEdgeLoad(edgeObj, fromNode, toNode) {
  const key = edgeKey(fromNode, toNode);
  return edgeLoadOverlay.has(key) ? edgeLoadOverlay.get(key) : edgeObj.currentLoad;
}

/** Increment ephemeral load for an undirected edge. */
function incrementEdgeLoad(n1, n2) {
  const key = edgeKey(n1, n2);
  const current = edgeLoadOverlay.get(key) ?? 0;
  edgeLoadOverlay.set(key, Math.min(1, current + EDGE_LOAD_INCREMENT));
}

/**
 * Reset the ephemeral edge-load overlay.
 * Call this when the simulation resets or between test cases so that
 * stale load data does not carry over across independent route computations.
 */
export function resetEdgeLoads() {
  edgeLoadOverlay.clear();
}

// ── Dijkstra with congestion-aware weights ───────────────────────────────
/**
 * Dijkstra using the ephemeral load overlay rather than mutating graph edges.
 * The shared graph singleton is read-only here; all congestion state lives in
 * edgeLoadOverlay and is discarded when resetEdgeLoads() is called.
 */
function dijkstra(fromNode, toNode) {
  return runDijkstra(graph.adjacencyList, fromNode, toNode, (cur, edge) => {
    // Read from the overlay (not edge.currentLoad) so we never touch the graph.
    const load = getEdgeLoad(edge, cur, edge.node);
    return edge.distance * (1 + Math.pow(load, 2) * CONGESTION_LOAD_SQ_COEFF);
  });
}

// ── Helpers ──────────────────────────────────────────────────────────────
function getDestinations(destType) {
  const typeMap = { food: 'stand', restroom: 'restroom', exit: 'gate' };
  const t = typeMap[destType] || destType;
  return Array.from(graph.nodes.values())
    .filter((n) => n.type === t)
    .map((n) => n.id);
}

function fanGraphNode(loc) {
  if (!loc) return DEFAULT_FAN_GRAPH_ZONE;
  if (loc.includes('-')) return loc.split('-')[0];
  return loc;
}

function rerouteDisplayCount(batchReroutes, batchSize) {
  return Math.min(
    980,
    Math.max(
      120,
      REROUTE_DISPLAY_BASE +
        batchReroutes * REROUTE_DISPLAY_PER_CONFLICT +
        Math.max(0, batchSize - 1) * REROUTE_DISPLAY_PER_REQ
    )
  );
}

// ── Nash Batch Processing ────────────────────────────────────────────────
function processNashBatch(batch, storeState) {
  let batchReroutes = 0;

  batch.forEach((req) => {
    const { destType, resolve } = req;
    const dests = getDestinations(destType);
    if (dests.length === 0) {
      resolve(null);
      return;
    }

    const from = fanGraphNode(storeState.currentFan?.location);

    const candidates = [];
    for (const dest of dests) {
      const result = dijkstra(from, dest);
      if (!result) continue;

      const sd = storeState.stands.get(dest);
      const waitTime = sd?.waitTime ?? 5;
      const qLen = sd?.queueLen ?? 0;
      const cap = sd?.capacity ?? DEFAULT_STAND_QUEUE_CAP;
      const capRem = Math.max(0.1, 1 - qLen / Math.max(1, cap));

      const score =
        (1 / Math.max(waitTime, 0.5)) * (1 / Math.max(result.cost, 1)) * capRem;

      candidates.push({ dest, path: result.path, cost: result.cost, score, waitTime });
    }

    if (candidates.length === 0) {
      resolve(null);
      return;
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];

    const closest = [...candidates].sort((a, b) => a.cost - b.cost)[0];
    if (best.dest !== closest.dest) batchReroutes++;

    // Accumulate load into the ephemeral overlay — graph singleton is untouched.
    for (let i = 0; i < best.path.length - 1; i++) {
      incrementEdgeLoad(best.path[i], best.path[i + 1]);
    }

    const simReroutes = rerouteDisplayCount(batchReroutes, batch.length);
    nashStats.totalRoutes++;
    nashStats.nashRerouteCount += simReroutes;
    nashStats.lastBatchSize = batch.length;

    const etaMinutes = Math.max(2, Math.min(25, Math.round(best.cost / 42)));

    resolve({
      path: best.path,
      destination: best.dest,
      pathCost: best.cost,
      waitTime: best.waitTime,
      etaMinutes,
      nashRerouteCount: simReroutes,
      alternatives: candidates.slice(1, 4).map((c) => ({
        dest: c.dest,
        cost: c.cost,
        waitTime: c.waitTime,
      })),
    });
  });

  useStore.getState().bumpNashRoutingEpoch?.();
}

// ── Public API ───────────────────────────────────────────────────────────

/**
 * Request a route for a fan to the best destination of a given type.
 * Requests are collected in short windows and processed as a Nash batch.
 */
export function requestRoute(fanId, destType) {
  return new Promise((resolve) => {
    routeRequestBatch.push({ fanId, destType, resolve });
    if (!batchTimer) {
      batchTimer = setTimeout(() => {
        const batch = [...routeRequestBatch];
        routeRequestBatch = [];
        batchTimer = null;
        const storeState = useStore.getState();
        processNashBatch(batch, storeState);
      }, NASH_BATCH_MS);
    }
  });
}

/**
 * Get cumulative Nash routing statistics.
 */
export function getNashStats() {
  return { ...nashStats };
}
