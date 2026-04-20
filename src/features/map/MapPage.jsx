import React, { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../auth/useAuth';
import { VenueMapCanvas } from './VenueMapCanvas';
import { BottomNav } from '../../components/ui/BottomNav';
import { ChevronLeft, Search } from 'lucide-react';
import { useMapRoutingState, formatEta } from './useMapRoutingState';
import { COMFORT_STATUS_COLORS } from '../../config/comfortConfig';

export const MapPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signOut } = useAuth();
  const {
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
  } = useMapRoutingState({ navigate, searchParams });
  const liveRegionRef = useRef(null);
  const headingRef = useRef(null);

  const handleBack = () => {
    if (isRouteSectionOpen) {
      cancelNavigation();
      return;
    }
    navigate(-1);
  };

  useEffect(() => {
    if (!isRouteSectionOpen || !selectedRoute || !navigationState) return;
    if (!liveRegionRef.current) return;
    liveRegionRef.current.textContent =
      `Route ${selectedRoute.id} selected to ${navigationState.destinationLabel}. ` +
      `Estimated time ${formatEta(selectedRoute.etaSeconds)}.`;
  }, [isRouteSectionOpen, selectedRoute, navigationState]);

  useEffect(() => {
    if (!headingRef.current) return;
    headingRef.current.focus({ preventScroll: true });
  }, [isRouteSectionOpen]);

  return (
    <div className="h-screen flex flex-col bg-stone-50 dark:bg-zinc-950">
      <header className="px-6 pt-10 pb-2 flex justify-between items-center z-10 shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            type="button"
            onClick={handleBack}
            className="w-11 h-11 bg-white dark:bg-zinc-900 rounded-full flex items-center justify-center shadow-sm shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            aria-label="Back"
          >
            <ChevronLeft className="dark:text-white" />
          </button>
          <h1
            ref={headingRef}
            data-page-heading
            tabIndex={-1}
            className="text-2xl font-bold dark:text-white truncate"
          >
            {isRouteSectionOpen ? 'Route guidance' : 'Live venue map'}
          </h1>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => signOut()}
            className="min-h-11 min-w-11 text-xs font-semibold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 px-2 py-2 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
          >
            Sign out
          </button>
          <button
            type="button"
            className="min-h-11 min-w-11 p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 rounded-lg"
            aria-label="Search"
          >
            <Search className="text-gray-500 dark:text-gray-400" />
          </button>
        </div>
      </header>

      <main id="main-content" className="flex-1 min-h-0 overflow-y-auto" aria-label="Map content">
        {!isRouteSectionOpen && (
          <div className="px-6 py-1 flex gap-2 overflow-x-auto no-scrollbar shrink-0 z-10">
            {['density', 'food', 'restrooms', 'exits'].map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => toggleFilter(f)}
                className={`min-h-11 px-4 py-2 rounded-full whitespace-nowrap text-sm font-semibold transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${filters[f] ? 'bg-blue-200 text-blue-900 dark:bg-blue-900 dark:text-blue-200' : 'bg-white text-gray-600 border border-gray-200 dark:bg-zinc-900 dark:text-gray-400 dark:border-zinc-800 shadow-sm'}`}
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
          <VenueMapCanvas
            filters={filters}
            hideRouteBadge
            routeOverlay={
              selectedRoute
                ? {
                    ...selectedRoute,
                    destination: navigationState?.destinationId,
                    destinationLabel: navigationState?.destinationLabel,
                    destinationType: navigationState?.destinationType,
                    nashRerouteCount: navigationState?.nashRerouteCount,
                    navMode: 'fan',
                  }
                : null
            }
            wheelZoomRequiresModifier
          />
        </div>
        <p className="px-4 -mt-1 mb-1 text-center text-[11px] text-gray-500 dark:text-gray-400 shrink-0">
          Keyboard: arrow keys pan, + / - zoom, 0 reset. Ctrl + scroll also zooms.
        </p>

        {isRouteSectionOpen ? (
          <div className="px-4 pb-2 space-y-3">
            <div className="rounded-2xl border border-blue-200 bg-blue-100/80 dark:bg-blue-950/30 dark:border-blue-800 px-4 py-3 flex items-center justify-between">
              <p className="text-sm font-bold text-blue-900 dark:text-blue-200">{navigationState.destinationLabel}</p>
              <p className="text-sm font-bold text-blue-900 dark:text-blue-200">{formatEta(selectedRoute.etaSeconds)}</p>
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
                <div
                  key={step.title}
                  className="py-3 border-b border-gray-100 dark:border-zinc-800 last:border-b-0 flex items-start justify-between gap-3"
                >
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
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: COMFORT_STATUS_COLORS.low }} />
                Low
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: COMFORT_STATUS_COLORS.moderate }} />
                Medium
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full" style={{ background: COMFORT_STATUS_COLORS.high }} />
                High
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm bg-[#3B82F6]" />
                Food stand
              </div>
            </div>

            <div className="px-6 shrink-0 mb-2">
              <div className="bg-[#F5F5F0] dark:bg-zinc-900 rounded-3xl p-5 flex justify-between shadow-inner items-center">
                <div>
                  <div className="text-gray-600 dark:text-gray-400 mb-1">
                    Quietest zone:{' '}
                    <span className="font-bold text-gray-900 dark:text-white capitalize">
                      {quietestZone.name.replace('Zone ', '')}
                    </span>
                  </div>
                  <div className="font-bold text-xl text-gray-900 dark:text-white">({quietestZone.density}%)</div>
                </div>
                <div className="w-px h-12 bg-gray-300 dark:bg-zinc-700" />
                <div className="text-right">
                  <div className="text-gray-600 dark:text-gray-400 mb-1">
                    Fastest food: <span className="font-bold text-gray-900 dark:text-white">{fastestFood.name}</span>
                  </div>
                  <div className="font-bold text-xl text-gray-900 dark:text-white">({fastestFood.waitTime}m)</div>
                </div>
              </div>
            </div>

            <div className="px-6 shrink-0 mb-2">
              <button
                type="button"
                onClick={handleFastestFoodRoute}
                disabled={routingBusy}
                className="w-full min-h-11 rounded-2xl border border-blue-200 dark:border-blue-700 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 flex items-center justify-between disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
              >
                <div className="text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-300">
                    Fastest food route
                  </p>
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
        <section
          className="mx-6 mb-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200"
          aria-labelledby="map-summary-heading"
        >
          <h2 id="map-summary-heading" className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
            Map summary
          </h2>
          <p className="mt-1">
            Quietest zone: {quietestZone.name}. Current density: {quietestZone.density}%.
            Fastest nearby stand: {fastestFood.name} with about {fastestFood.waitTime} minute wait.
          </p>
          {isRouteSectionOpen && selectedRoute ? (
            <p className="mt-1">
              Active route {selectedRoute.id} to {navigationState.destinationLabel}, ETA{' '}
              {formatEta(selectedRoute.etaSeconds)}.
            </p>
          ) : null}
        </section>
        <p ref={liveRegionRef} className="sr-only" role="status" aria-live="polite" aria-atomic="true" />
      </main>

      <BottomNav />
    </div>
  );
};
