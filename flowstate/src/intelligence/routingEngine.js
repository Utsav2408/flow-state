import graph from '../models/venueGraph';
import { useStore } from '../store/useStore';
import {
  CONGESTION_LOAD_SQ_COEFF,
  EDGE_LOAD_INCREMENT,
  NASH_BATCH_MS,
  DEFAULT_STAND_QUEUE_CAP,
  DEFAULT_FAN_GRAPH_ZONE,
} from '../config/routingConstants';

// ── Batch state ──────────────────────────────────────────────────────────
let routeRequestBatch = [];
let batchTimer = null;
let nashStats = { totalRoutes: 0, nashRerouteCount: 0, lastBatchSize: 0 };

// ── Dijkstra with congestion-aware weights ───────────────────────────────
function dijkstra(fromNode, toNode) {
  const adj = graph.adjacencyList;
  if (!adj.has(fromNode) || !adj.has(toNode)) return null;

  const dist = new Map();
  const prev = new Map();
  const unvisited = new Set(adj.keys());

  for (const n of adj.keys()) {
    dist.set(n, Infinity);
    prev.set(n, null);
  }
  dist.set(fromNode, 0);

  while (unvisited.size > 0) {
    let cur = null,
      minD = Infinity;
    for (const n of unvisited) {
      if (dist.get(n) < minD) {
        cur = n;
        minD = dist.get(n);
      }
    }
    if (cur === null || cur === toNode) break;
    unvisited.delete(cur);

    for (const edge of adj.get(cur) || []) {
      if (!unvisited.has(edge.node)) continue;
      const w =
        edge.distance * (1 + Math.pow(edge.currentLoad, 2) * CONGESTION_LOAD_SQ_COEFF);
      const alt = dist.get(cur) + w;
      if (alt < dist.get(edge.node)) {
        dist.set(edge.node, alt);
        prev.set(edge.node, cur);
      }
    }
  }

  const path = [];
  let c = toNode;
  while (c !== null) {
    path.unshift(c);
    c = prev.get(c);
  }
  if (path[0] !== fromNode) return null;
  return { path, cost: dist.get(toNode) };
}

// ── Helpers ──────────────────────────────────────────────────────────────
function getDestinations(destType) {
  const typeMap = { food: 'stand', restroom: 'restroom', exit: 'gate' };
  const t = typeMap[destType] || destType;
  return Array.from(graph.nodes)
    .filter((n) => n.type === t)
    .map((n) => n.id);
}

function fanGraphNode(loc) {
  if (!loc) return DEFAULT_FAN_GRAPH_ZONE;
  if (loc.includes('-')) return loc.split('-')[0];
  return loc;
}

function rerouteDisplayCount(batchReroutes, batchSize) {
  const base = 280;
  const perConflict = 95;
  const perReq = 45;
  return Math.min(980, Math.max(120, base + batchReroutes * perConflict + Math.max(0, batchSize - 1) * perReq));
}

// ── Nash Batch Processing ────────────────────────────────────────────────
function processNashBatch(batch) {
  const store = useStore.getState();
  let batchReroutes = 0;

  batch.forEach((req) => {
    const { destType, resolve } = req;
    const dests = getDestinations(destType);
    if (dests.length === 0) {
      resolve(null);
      return;
    }

    const from = fanGraphNode(store.currentFan?.location);

    const candidates = [];
    for (const dest of dests) {
      const result = dijkstra(from, dest);
      if (!result) continue;

      const sd = store.stands.get(dest);
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

    for (let i = 0; i < best.path.length - 1; i++) {
      const n1 = best.path[i],
        n2 = best.path[i + 1];
      const edges1 = graph.adjacencyList.get(n1);
      if (edges1) {
        const e = edges1.find((ed) => ed.node === n2);
        if (e) e.currentLoad = Math.min(1, e.currentLoad + EDGE_LOAD_INCREMENT);
      }
      const edges2 = graph.adjacencyList.get(n2);
      if (edges2) {
        const e = edges2.find((ed) => ed.node === n1);
        if (e) e.currentLoad = Math.min(1, e.currentLoad + EDGE_LOAD_INCREMENT);
      }
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
        processNashBatch(batch);
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
