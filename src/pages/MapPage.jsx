import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { useAuth } from '../auth/useAuth';
import { VenueMapCanvas } from '../components/VenueMapCanvas';
import { BottomNav } from '../components/Shared';
import { ChevronLeft, Search } from 'lucide-react';
import graph from '../models/venueGraph';
import { requestRoute, getNashStats } from '../intelligence/routingEngine';
import { getNodeCanvasPos } from '../models/venueLayout';

const fanGraphNode = (location) => {
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

const formatEta = (etaSeconds) => {
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

export const MapPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signOut } = useAuth();
  const [filters, setFilters] = useState({
    density: true,
    food: true,
    restrooms: true,
    exits: true,
    /** Only show your pin on the live map; other group members stay on the group screen */
    group: false,
  });
  const [navigationState, setNavigationState] = useState(null);
  const [routingBusy, setRoutingBusy] = useState(false);
  const zones = useStore(state => state.zones);
  const stands = useStore(state => state.stands);
  const currentFan = useStore(state => state.currentFan);
  const setActiveRoute = useStore(state => state.setActiveRoute);
  const clearActiveRoute = useStore(state => state.clearActiveRoute);

  const toggleFilter = (key) => {
    setFilters(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Compute Quietest Zone & Fastest Food for the bottom card
  let quietestZone = { name: '--', density: 100 };
  zones.forEach((z) => {
    if (z.density < quietestZone.density && z.density > 0) {
      quietestZone = z;
    }
  });

  let fastestFood = { name: '--', waitTime: 999 };
  stands.forEach((s, id) => {
    if (s.waitTime < fastestFood.waitTime) {
      fastestFood = { name: id, waitTime: s.waitTime }; // Displaying stand ID like Wireframe
    }
  });

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
    const from = fanGraphNode(currentFan?.location);
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
      const fallback = [from, destinationId];
      path = fallback;
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

  const handleBack = () => {
    if (isRouteSectionOpen) {
      cancelNavigation();
      return;
    }
    navigate(-1);
  };

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

  return (
    <div className="h-screen flex flex-col bg-stone-50 dark:bg-zinc-950">
      <header className="px-6 pt-10 pb-2 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="w-10 h-10 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center shadow-sm shrink-0"
            aria-label="Back"
          >
            <ChevronLeft className="dark:text-white" />
          </button>
          <h1 className="text-2xl font-bold dark:text-white truncate">
            {isRouteSectionOpen ? 'Route guidance' : 'Live venue map'}
          </h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-2 py-2 whitespace-nowrap"
          >
            Sign out
          </button>
          <button type="button" className="p-2" aria-label="Search">
            <Search className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {!isRouteSectionOpen && (
          <div className="px-6 py-1 flex gap-2 overflow-x-auto no-scrollbar shrink-0 z-10">
            {['density', 'food', 'restrooms', 'exits'].map(f => (
              <button
                key={f}
                onClick={() => toggleFilter(f)}
                className={`px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all duration-300 ${filters[f] ? 'bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-200' : 'bg-white text-gray-600 border border-gray-200 dark:bg-zinc-900 dark:text-gray-400 dark:border-zinc-800 shadow-sm'}`}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        )}

        <div
          className={`px-4 py-2 relative ${
            isRouteSectionOpen
              ? 'shrink-0 h-[350px] min-h-[350px] sm:h-[400px] sm:min-h-[400px]'
              : 'shrink-0 h-[320px] min-h-[320px] sm:h-[380px] sm:min-h-[380px]'
          }`}
        >
          <VenueMapCanvas filters={filters} hideRouteBadge routeOverlay={selectedRoute ? {
            ...selectedRoute,
            destination: navigationState?.destinationId,
            destinationLabel: navigationState?.destinationLabel,
            destinationType: navigationState?.destinationType,
            nashRerouteCount: navigationState?.nashRerouteCount,
            navMode: 'fan',
          } : null} wheelZoomRequiresModifier />
        </div>
        <p className="px-4 -mt-1 mb-1 text-center text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
          Ctrl + scroll to zoom map
        </p>

        {isRouteSectionOpen ? (
          <div className="px-4 pb-2 space-y-3">
          <div className="rounded-2xl border border-blue-200 bg-blue-100/80 dark:bg-blue-950/30 dark:border-blue-800 px-4 py-3 flex items-center justify-between">
            <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
              {navigationState.destinationLabel}
            </p>
            <p className="text-sm font-bold text-blue-900 dark:text-blue-200">
              {formatEta(selectedRoute.etaSeconds)}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {navigationState.routes.map((route) => (
              <button
                key={route.id}
                type="button"
                onClick={() => switchRoute(route.id)}
                className={`rounded-2xl border p-2 text-left ${
                  navigationState.selectedRouteId === route.id
                    ? 'bg-blue-100 border-blue-300 dark:bg-blue-900/30 dark:border-blue-700'
                    : 'bg-white border-gray-200 dark:bg-zinc-900 dark:border-zinc-700'
                }`}
              >
                <p className="text-sm font-bold text-gray-900 dark:text-white">Route {route.id}</p>
                <p className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {formatEta(route.etaSeconds)} - {crowdTagByRoute[route.id] || 'alt'}
                </p>
              </button>
            ))}
          </div>

          <div className="rounded-2xl bg-teal-100/70 border border-teal-200 dark:bg-teal-950/30 dark:border-teal-800 px-4 py-3">
            <p className="text-sm font-semibold text-teal-900 dark:text-teal-200">
              Smart route: {navigationState.nashRerouteCount || 847} others are being routed away from your path right now to keep your wait low.
            </p>
          </div>

          <div className="rounded-2xl bg-white border border-gray-200 dark:bg-zinc-900 dark:border-zinc-700 px-4 py-2">
            <p className="text-xs font-bold text-gray-500 dark:text-gray-400 tracking-wider">TURN-BY-TURN</p>
            {turnByTurn.map((step) => (
              <div key={step.title} className="py-3 border-b border-gray-100 dark:border-zinc-800 last:border-b-0 flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-gray-900 dark:text-white">{step.title}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{step.subtitle}</p>
                </div>
                <p className="text-base font-semibold text-gray-700 dark:text-gray-300">{step.time}</p>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={cancelNavigation}
            className="w-full rounded-xl bg-gray-100 dark:bg-zinc-800 px-4 py-2 text-sm font-semibold text-gray-700 dark:text-gray-200"
          >
            Back to overview map
          </button>
          </div>
        ) : (
          <>
            <div className="px-6 shrink-0 flex gap-4 justify-center items-center text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400 mb-2">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#9FE1CB]"></span> Low</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#FAC775]"></span> Medium</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#F09595]"></span> High</div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#3B82F6]"></span> Food stand</div>
            </div>

            <div className="px-6 shrink-0 mb-2">
              <div className="bg-[#F5F5F0] dark:bg-zinc-900 rounded-3xl p-5 flex justify-between shadow-inner items-center">
                <div>
                  <div className="text-gray-600 dark:text-gray-400 mb-1">Quietest zone: <span className="font-bold text-gray-900 dark:text-white capitalize">{quietestZone.name.replace('Zone ', '')}</span></div>
                  <div className="font-bold text-xl text-gray-900 dark:text-white">({quietestZone.density}%)</div>
                </div>
                <div className="w-px h-12 bg-gray-300 dark:bg-zinc-700"></div>
                <div className="text-right">
                  <div className="text-gray-600 dark:text-gray-400 mb-1">Fastest food: <span className="font-bold text-gray-900 dark:text-white">{fastestFood.name}</span></div>
                  <div className="font-bold text-xl text-gray-900 dark:text-white">({fastestFood.waitTime}m)</div>
                </div>
              </div>
            </div>

            <div className="px-6 shrink-0 mb-2">
              <button
                type="button"
                onClick={handleFastestFoodRoute}
                disabled={routingBusy}
                className="w-full rounded-2xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 flex items-center justify-between disabled:opacity-60"
              >
                <div className="text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">Fastest food route</p>
                  <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                    {fastestFood.name} - {Math.max(1, Math.round(Number(fastestFood.waitTime) || 1))}m wait
                  </p>
                </div>
                <span className="text-sm font-bold text-blue-800 dark:text-blue-200">
                  {routingBusy ? 'Loading...' : 'Open route'}
                </span>
              </button>
            </div>
          </>
        )}
      </div>

      <BottomNav />
    </div>
  );
};
