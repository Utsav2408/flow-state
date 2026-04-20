import { useCallback, useEffect, useMemo, useState } from 'react';
import { useStore } from '../store/useStore';
import graph from '../models/venueGraph';
import { requestRoute, getNashStats } from '../intelligence/routingEngine';
import { getNodeCanvasPos } from '../models/venueLayout';

const resolveFanGraphNode = (location) => {
  if (!location) return 'B4';
  if (location.includes('-')) return location.split('-')[0];
  return location;
};

const estimatePathCost = (path) => {
  if (!Array.isArray(path) || path.length < 2) return 0;
  let cost = 0;
  for (let i = 0; i < path.length - 1; i += 1) {
    const from = path[i];
    const to = path[i + 1];
    const edge = graph.getNeighbors(from).find((n) => n.node === to);
    cost += edge?.distance ?? 20;
  }
  return cost;
};

const toEtaSeconds = (cost, fallbackMinutes = 2) => {
  if (!cost) return Math.max(60, Math.round(fallbackMinutes * 60));
  return Math.max(60, Math.round(cost * 2.8));
};

export const formatEta = (etaSeconds) => {
  const m = Math.floor(etaSeconds / 60);
  const s = etaSeconds % 60;
  return `${m}m ${String(s).padStart(2, '0')}s`;
};

const buildPathPoints = (path) => {
  const points = [];
  path.forEach((nodeId) => {
    const p = getNodeCanvasPos(nodeId);
    if (!p) return;
    const last = points[points.length - 1];
    if (!last || Math.abs(last.x - p.x) > 5 || Math.abs(last.y - p.y) > 5) {
      points.push(p);
    }
  });
  return points;
};

const offsetPointsAtMid = (points, offset) => {
  if (!offset || points.length < 2) return points;
  const out = [...points];
  const mid = Math.floor((points.length - 1) / 2);
  const p0 = points[Math.max(0, mid - 1)];
  const p1 = points[Math.min(points.length - 1, mid + 1)];
  const vx = p1.x - p0.x;
  const vy = p1.y - p0.y;
  const len = Math.hypot(vx, vy) || 1;
  const nx = -vy / len;
  const ny = vx / len;
  out.splice(mid + 1, 0, {
    x: points[mid].x + nx * offset,
    y: points[mid].y + ny * offset,
  });
  return out;
};

/**
 * Encapsulates map routing/filter state and route option generation.
 * Keeps `MapPage` focused on rendering and simple event wiring.
 */
export function useMapRoutingState({ navigate, searchParams }) {
  const zones = useStore((state) => state.zones);
  const stands = useStore((state) => state.stands);
  const currentFan = useStore((state) => state.currentFan);
  const setActiveRoute = useStore((state) => state.setActiveRoute);
  const clearActiveRoute = useStore((state) => state.clearActiveRoute);

  const [filters, setFilters] = useState({
    density: true,
    food: true,
    restrooms: true,
    exits: true,
    group: false,
  });
  const [navigationState, setNavigationState] = useState(null);
  const [routingBusy, setRoutingBusy] = useState(false);

  const toggleFilter = (key) => {
    setFilters((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const quietestZone = useMemo(() => {
    let best = { name: '--', density: 100 };
    zones.forEach((z) => {
      if (z.density < best.density && z.density > 0) {
        best = z;
      }
    });
    return best;
  }, [zones]);

  const fastestFood = useMemo(() => {
    let best = { name: '--', waitTime: 999 };
    stands.forEach((s, id) => {
      if (s.waitTime < best.waitTime) {
        best = { name: id, waitTime: s.waitTime };
      }
    });
    return best;
  }, [stands]);

  const enterNavigationMode = useCallback((routeMeta) => {
    setNavigationState(routeMeta);
    const selected = routeMeta.routes.find((r) => r.id === routeMeta.selectedRouteId) || routeMeta.routes[0];
    setActiveRoute({
      ...selected,
      destination: routeMeta.destinationId,
      destinationLabel: routeMeta.destinationLabel,
      destinationType: routeMeta.destinationType,
      path: selected.path,
      pathPoints: selected.pathPoints,
      nashRerouteCount: routeMeta.nashRerouteCount,
      navMode: 'fan',
    });
  }, [setActiveRoute]);

  const switchRoute = (routeId) => {
    setNavigationState((prev) => {
      if (!prev) return prev;
      const next = { ...prev, selectedRouteId: routeId };
      const selected = next.routes.find((r) => r.id === routeId) || next.routes[0];
      setActiveRoute({
        ...selected,
        destination: next.destinationId,
        destinationLabel: next.destinationLabel,
        destinationType: next.destinationType,
        path: selected.path,
        pathPoints: selected.pathPoints,
        nashRerouteCount: next.nashRerouteCount,
        navMode: 'fan',
      });
      return next;
    });
  };

  const cancelNavigation = () => {
    setNavigationState(null);
    clearActiveRoute();
    if (searchParams.get('dest')) {
      navigate('/map', { replace: true });
    }
  };

  const buildRouteOptions = useCallback(async (destinationId, destinationType) => {
    const from = resolveFanGraphNode(currentFan?.location);
    let path = graph.getShortestPath(from, destinationId) || [];
    let pathCost = estimatePathCost(path);
    let etaSeconds = toEtaSeconds(pathCost);
    let nashRerouteCount = getNashStats()?.nashRerouteCount || 847;
    let alternativesFromEngine = [];

    if (typeof requestRoute === 'function' && (destinationType === 'food' || destinationType === 'restroom')) {
      const result = await requestRoute(currentFan?.id || 'fan-1', destinationType);
      if (result) {
        nashRerouteCount = result.nashRerouteCount || nashRerouteCount;
        if (result.destination === destinationId && Array.isArray(result.path) && result.path.length > 1) {
          path = result.path;
          pathCost = result.pathCost ?? estimatePathCost(path);
          etaSeconds = toEtaSeconds(pathCost, result.etaMinutes);
          alternativesFromEngine = result.alternatives || [];
        }
      }
    }

    if (!path.length) {
      path = [from, destinationId];
      pathCost = estimatePathCost(path);
      etaSeconds = toEtaSeconds(pathCost);
    }

    const pathPoints = buildPathPoints(path);
    const routeA = {
      id: 'A',
      pillLabel: `Route A: ${formatEta(etaSeconds)}`,
      etaSeconds,
      path,
      pathPoints: offsetPointsAtMid(pathPoints, 0),
    };

    let routeB;
    let routeC;
    if (alternativesFromEngine.length >= 2) {
      const altBPath = graph.getShortestPath(from, alternativesFromEngine[0].dest) || path;
      const altCPath = graph.getShortestPath(from, alternativesFromEngine[1].dest) || path;
      const etaB = toEtaSeconds(alternativesFromEngine[0].cost, 3);
      const etaC = toEtaSeconds(alternativesFromEngine[1].cost, 4);
      routeB = {
        id: 'B',
        pillLabel: `Route B: ${formatEta(etaB)}`,
        etaSeconds: etaB,
        path: altBPath,
        pathPoints: offsetPointsAtMid(buildPathPoints(altBPath), 14),
      };
      routeC = {
        id: 'C',
        pillLabel: `Route C: ${formatEta(etaC)}`,
        etaSeconds: etaC,
        path: altCPath,
        pathPoints: offsetPointsAtMid(buildPathPoints(altCPath), -14),
      };
    } else {
      const etaB = etaSeconds + 30;
      const etaC = etaSeconds + 100;
      routeB = {
        id: 'B',
        pillLabel: `Route B: ${formatEta(etaB)}`,
        etaSeconds: etaB,
        path,
        pathPoints: offsetPointsAtMid(pathPoints, 14),
      };
      routeC = {
        id: 'C',
        pillLabel: `Route C: ${formatEta(etaC)}`,
        etaSeconds: etaC,
        path,
        pathPoints: offsetPointsAtMid(pathPoints, -14),
      };
    }

    return {
      destinationId,
      destinationType,
      destinationLabel:
        destinationType === 'food'
          ? `Stand ${destinationId.replace('S', '')} — South concourse`
          : `Restroom ${destinationId.replace('R', '')} — Main concourse`,
      nashRerouteCount: nashRerouteCount || 847,
      selectedRouteId: 'A',
      routes: [routeA, routeB, routeC],
    };
  }, [currentFan?.id, currentFan?.location]);

  const startNavigationToDestination = useCallback(async (destinationId, destinationType) => {
    setRoutingBusy(true);
    try {
      const routeMeta = await buildRouteOptions(destinationId, destinationType);
      enterNavigationMode(routeMeta);
    } finally {
      setRoutingBusy(false);
    }
  }, [buildRouteOptions, enterNavigationMode]);

  useEffect(() => {
    const destinationId = searchParams.get('dest');
    if (!destinationId) return;
    const normalized = destinationId.toUpperCase();
    const destinationType = normalized.startsWith('R') ? 'restroom' : 'food';
    const timer = setTimeout(() => {
      startNavigationToDestination(normalized, destinationType);
    }, 0);
    return () => clearTimeout(timer);
  }, [searchParams, startNavigationToDestination]);

  const selectedRoute = navigationState?.routes.find((r) => r.id === navigationState.selectedRouteId);
  const isRouteSectionOpen = Boolean(navigationState && selectedRoute);

  const crowdTagByRoute = {
    A: 'low crowd',
    B: 'medium',
    C: 'empty',
  };

  const formatStepTime = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s ? `${m}m ${String(s).padStart(2, '0')}s` : `${m}m`;
  };

  const turnByTurn = useMemo(() => {
    if (!selectedRoute || !navigationState) return [];
    const total = selectedRoute.etaSeconds;
    const first = Math.max(20, Math.round(total * 0.58));
    const second = Math.max(15, total - first);
    return [
      {
        title:
          navigationState.destinationType === 'restroom'
            ? 'Head toward nearest restroom corridor'
            : 'Head south along B4 corridor',
        subtitle:
          navigationState.destinationType === 'restroom'
            ? 'Follow the blue path past the concourse'
            : 'Past restroom block',
        time: formatStepTime(first),
      },
      {
        title:
          navigationState.destinationType === 'restroom'
            ? 'Continue straight to destination'
            : 'Turn left at south concourse',
        subtitle:
          navigationState.destinationType === 'restroom'
            ? `${navigationState.destinationLabel} ahead`
            : `${navigationState.destinationLabel} on your right`,
        time: formatStepTime(second),
      },
    ];
  }, [navigationState, selectedRoute]);

  const handleFastestFoodRoute = () => {
    const destinationId = fastestFood.name !== '--' ? fastestFood.name : 'S12';
    startNavigationToDestination(destinationId, 'food');
  };

  return {
    filters,
    toggleFilter,
    routingBusy,
    quietestZone,
    fastestFood,
    navigationState,
    selectedRoute,
    isRouteSectionOpen,
    crowdTagByRoute,
    turnByTurn,
    switchRoute,
    cancelNavigation,
    handleFastestFoodRoute,
  };
}
