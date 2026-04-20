import { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../../store/useStore';
import {
  getComfortScore,
  getComfortColor,
  normalizeDensityPercent,
  COMFORT_THRESHOLDS,
} from '../../intelligence/comfortScoring';
import { getNashStats } from '../../intelligence/routingEngine';
import { generateActionRecommendation } from '../../services/geminiService';
import { trackEvent } from '../../services/analyticsService';
import { estimateWalkMetersFromPathCost, getZoneAliasesForGroup } from '../../models/venueLayout';

/**
 * Encapsulates Home page simulation-aware recommendations and derived metrics.
 * Keeps the page component primarily presentational.
 */
export function useHomePageState(navigate) {
  const currentFan = useStore((state) => state.currentFan);
  const zones = useStore((state) => state.zones);
  const stands = useStore((state) => state.stands);
  const simState = useStore((state) => state.simState);
  const activeRoute = useStore((state) => state.activeRoute);
  const nashRoutingEpoch = useStore((state) => state.nashRoutingEpoch);

  const [routing, setRouting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(() => simState?.halftimeCountdownSeconds ?? 480);
  const [aiRecommendation, setAiRecommendation] = useState(null);
  const lastActionContextRef = useRef(null);

  useEffect(() => {
    const seed = simState?.halftimeCountdownSeconds;
    if (seed != null && seed >= 0) {
      queueMicrotask(() => {
        setTimeLeft(seed);
      });
    }
  }, [simState?.halftimeCountdownSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000 / (simState?.speed || 1));
    return () => clearInterval(interval);
  }, [simState?.speed]);

  const isEgress =
    simState?.state?.toLowerCase() === 'post_match' ||
    simState?.state?.toLowerCase() === 'post-match';

  const zoneId = currentFan?.location || 'B4-B6';

  const comfortScore = useMemo(
    () => getComfortScore(zoneId, zones, stands),
    [zones, stands, zoneId],
  );
  const comfortColor = getComfortColor(comfortScore);

  const nearestFood = useMemo(() => {
    let best = null;
    stands.forEach((s, id) => {
      const w = s.waitTime;
      if (w === undefined || w === null || Number.isNaN(Number(w))) return;
      const wt = Number(w);
      if (best === null || wt < best.waitTime) best = { id, waitTime: wt };
    });
    return best ?? { id: '--', waitTime: null };
  }, [stands]);

  const avgWait = useMemo(() => {
    let total = 0;
    let count = 0;
    stands.forEach((s) => {
      if (s.waitTime !== undefined) {
        total += s.waitTime;
        count += 1;
      }
    });
    return count > 0 ? Math.round(total / count) : 0;
  }, [stands]);

  const crowdLevel = useMemo(() => {
    const group = getZoneAliasesForGroup(zoneId);
    let total = 0;
    let count = 0;
    group.forEach((z) => {
      const d = zones.get(z);
      if (d?.density !== undefined) {
        total += normalizeDensityPercent(d.density);
        count += 1;
      }
    });
    return count > 0 ? Math.round(total / count) : 0;
  }, [zones, zoneId]);

  const promoWalkMeters = useMemo(() => {
    if (activeRoute?.pathCost != null) {
      return estimateWalkMetersFromPathCost(activeRoute.pathCost);
    }
    return Math.min(220, Math.round(48 + crowdLevel * 1.8));
  }, [activeRoute, crowdLevel]);

  const activeRouteCount = useMemo(() => {
    void nashRoutingEpoch;
    const stats = getNashStats();
    return stats.totalRoutes || 0;
  }, [nashRoutingEpoch]);

  const predictionText = useMemo(() => {
    const section = zoneId.split('-')[0];
    if (comfortScore >= COMFORT_THRESHOLDS.good) return `Section ${section} - looking good for 15 min`;
    if (comfortScore >= COMFORT_THRESHOLDS.moderate) return `Section ${section} - moderate crowd expected`;
    return `Section ${section} - consider moving soon`;
  }, [comfortScore, zoneId]);

  const fallbackAction = useMemo(() => {
    if (nearestFood.waitTime != null && nearestFood.waitTime < 3) {
      return {
        type: 'food',
        title: 'Grab food now - ideal window',
        subtitle: `Stand ${String(nearestFood.id).replace('S', '')} has a ${nearestFood.waitTime} min wait (vs ${avgWait} min avg). Route avoids halftime rush. Tap to navigate.`,
        bg: 'from-emerald-600/10 to-teal-500/10',
        border: 'border-emerald-200',
        titleColor: 'text-emerald-900',
        subtitleColor: 'text-emerald-700',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
      };
    }
    if (comfortScore < COMFORT_THRESHOLDS.moderate) {
      return {
        type: 'crowded',
        title: 'Your zone is getting crowded',
        subtitle: 'Consider visiting a food stand or moving to a quieter section for better comfort.',
        bg: 'from-amber-500/10 to-orange-400/10',
        border: 'border-amber-200',
        titleColor: 'text-amber-900',
        subtitleColor: 'text-amber-700',
        iconBg: 'bg-amber-100',
        iconColor: 'text-amber-600',
      };
    }
    return {
      type: 'good',
      title: "You're in a great spot",
      subtitle: "Enjoy the match! We'll let you know when there's a smart time to grab food or move.",
      bg: 'from-blue-500/10 to-indigo-400/10',
      border: 'border-blue-200',
      titleColor: 'text-blue-900',
      subtitleColor: 'text-blue-700',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
    };
  }, [nearestFood, comfortScore, avgWait]);

  const matchState = simState?.state || 'in_match';

  useEffect(() => {
    const previous = lastActionContextRef.current;
    const changedMatchState = previous?.matchState !== matchState;
    const changedComfortBand = previous == null || Math.abs(previous.comfortScore - comfortScore) >= 5;

    if (!changedMatchState && !changedComfortBand) return;

    const waitBeforeCall = previous == null ? 0 : 30000;

    const timeout = setTimeout(() => {
      let cancelled = false;

      const fallbackTimeout = setTimeout(() => {
        cancelled = true;
      }, 8000);

      generateActionRecommendation({
        zoneName: zoneId,
        comfortScore,
        nearestStand: nearestFood.id,
        nearestWait: nearestFood.waitTime ?? 'unknown',
        crowdLevel,
        matchState,
      })
        .then((text) => {
          if (cancelled) return;
          const trimmed = typeof text === 'string' ? text.trim() : '';
          if (trimmed) {
            setAiRecommendation(trimmed);
            trackEvent('ai_recommendation_shown', {
              context: 'home',
              match_state: matchState,
              comfort_score: comfortScore,
            });
          }
        })
        .catch(() => {
          // Keep fallback recommendation visible; Gemini should never block UI.
        })
        .finally(() => {
          clearTimeout(fallbackTimeout);
        });

      lastActionContextRef.current = {
        comfortScore,
        matchState,
      };
    }, waitBeforeCall);

    return () => clearTimeout(timeout);
  }, [comfortScore, matchState, zoneId, nearestFood.id, nearestFood.waitTime, crowdLevel]);

  const handleRouteRequest = async () => {
    const target = nearestFood.id && nearestFood.id !== '--' ? nearestFood.id : 'S12';
    setRouting(true);
    trackEvent('route_requested', {
      source: 'home',
      destination: target,
      comfort_score: comfortScore,
      crowd_level: crowdLevel,
    });
    navigate(`/map?dest=${encodeURIComponent(target)}`);
    setTimeout(() => setRouting(false), 250);
  };

  return {
    simState,
    nearestFood,
    comfortScore,
    comfortColor,
    predictionText,
    isEgress,
    fallbackAction,
    routing,
    aiRecommendation,
    handleRouteRequest,
    crowdLevel,
    activeRouteCount,
    promoWalkMeters,
    timeLeft,
  };
}
