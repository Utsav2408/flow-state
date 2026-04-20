import React, { useMemo, useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import {
  getComfortScore,
  getComfortColor,
  normalizeDensityPercent,
  COMFORT_THRESHOLDS,
} from '../intelligence/comfortScoring';
import { getNashStats } from '../intelligence/routingEngine';
import { generateActionRecommendation } from '../services/geminiService';
import {
  estimateWalkMetersFromPathCost,
  getZoneAliasesForGroup,
} from '../models/venueLayout';
import { BottomNav } from '../components/Shared';
import { useAuth } from '../auth/useAuth';
import { Map, UtensilsCrossed, Users, Star, ArrowUp, Sparkles } from 'lucide-react';

// ─── Comfort Gauge (Hero) ──────────────────────────────────────────────────
const ComfortGaugeHero = ({ value }) => {
  const color = getComfortColor(value);
  const size = 200;
  const ctr = size / 2;
  const r = 80;
  const sw = 12;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;               // 270° arc
  const off = arc * (1 - value / 100);   // dashoffset for fill level

  return (
    <div className="relative flex items-center justify-center mx-auto" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={ctr} cy={ctr} r={r}
          fill="none" stroke="#E5E7EB"
          strokeWidth={sw}
          strokeDasharray={`${arc} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(135 ${ctr} ${ctr})`}
        />
        {/* Animated value arc */}
        <circle
          cx={ctr} cy={ctr} r={r}
          fill="none" stroke={color}
          strokeWidth={sw}
          strokeDasharray={`${arc} ${circ}`}
          strokeDashoffset={off}
          strokeLinecap="round"
          transform={`rotate(135 ${ctr} ${ctr})`}
          style={{ transition: 'stroke-dashoffset 1.5s cubic-bezier(.4,0,.2,1), stroke 0.5s' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-6xl font-extrabold tracking-tight" style={{ color }}>
          {value}
        </span>
      </div>
    </div>
  );
};

// ─── Stat Card ──────────────────────────────────────────────────────────────
const StatCard = ({ value, label, color }) => (
  <div className="bg-white rounded-2xl p-4 flex flex-col items-center justify-center shadow-sm border border-gray-100">
    <span className="text-2xl font-extrabold" style={{ color }}>{value}</span>
    <span className="text-[10px] font-bold text-gray-400 mt-1 tracking-wider">{label}</span>
  </div>
);

// ─── Quick Nav Button ───────────────────────────────────────────────────────
const QuickNavBtn = ({ icon, label, onClick, bg, iconColor }) => (
  <button
    onClick={onClick}
    className={`${bg} rounded-2xl p-4 flex flex-col items-center gap-2 transition-transform active:scale-95`}
  >
    <span className={iconColor}>{icon}</span>
    <span className="text-xs font-semibold text-gray-600">{label}</span>
  </button>
);

// ─── Main Component ─────────────────────────────────────────────────────────
export const HomePage = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const currentFan = useStore(s => s.currentFan);
  const zones = useStore(s => s.zones);
  const stands = useStore(s => s.stands);
  const simState = useStore(s => s.simState);
  const activeRoute = useStore(s => s.activeRoute);
  const nashRoutingEpoch = useStore(s => s.nashRoutingEpoch);

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

  // ── Comfort score — zones & stands passed explicitly (no store read inside) ──
  const comfortScore = useMemo(
    () => getComfortScore(zoneId, zones, stands),
    [zones, stands, zoneId],
  );
  const comfortColor = getComfortColor(comfortScore);

  // ── Nearest food stand ──────────────────────────────────────────────
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

  // ── Average wait across all stands ──────────────────────────────────
  const avgWait = useMemo(() => {
    let total = 0, cnt = 0;
    stands.forEach(s => { if (s.waitTime !== undefined) { total += s.waitTime; cnt++; } });
    return cnt > 0 ? Math.round(total / cnt) : 0;
  }, [stands]);

  // ── Crowd level (fan's zone group density) ──────────────────────────
  const crowdLevel = useMemo(() => {
    const group = getZoneAliasesForGroup(zoneId);
    let total = 0, cnt = 0;
    group.forEach(z => {
      const d = zones.get(z);
      if (d?.density !== undefined) { total += normalizeDensityPercent(d.density); cnt++; }
    });
    return cnt > 0 ? Math.round(total / cnt) : 0;
  }, [zones, zoneId]);

  const promoWalkMeters = useMemo(() => {
    if (activeRoute?.pathCost != null)
      return estimateWalkMetersFromPathCost(activeRoute.pathCost);
    return Math.min(220, Math.round(48 + crowdLevel * 1.8));
  }, [activeRoute, crowdLevel]);

  // ── Active route count ──────────────────────────────────────────────
  const activeRouteCount = useMemo(() => {
    void nashRoutingEpoch;
    const stats = getNashStats();
    return stats.totalRoutes || 0;
  }, [nashRoutingEpoch]);

  // ── Prediction text ─────────────────────────────────────────────────
  const predictionText = useMemo(() => {
    const section = zoneId.split('-')[0];
    if (comfortScore >= COMFORT_THRESHOLDS.good)
      return `Section ${section} — looking good for 15 min`;
    if (comfortScore >= COMFORT_THRESHOLDS.moderate)
      return `Section ${section} — moderate crowd expected`;
    return `Section ${section} — consider moving soon`;
  }, [comfortScore, zoneId]);

  // ── Action Card fallback logic ───────────────────────────────────────
  const fallbackAction = useMemo(() => {
    if (nearestFood.waitTime != null && nearestFood.waitTime < 3) {
      return {
        type: 'food',
        title: 'Grab food now — ideal window',
        subtitle: `Stand ${String(nearestFood.id).replace('S', '')} has a ${nearestFood.waitTime} min wait (vs ${avgWait} min avg). Route avoids halftime rush. Tap to navigate.`,
        bg: 'from-emerald-600/10 to-teal-500/10',
        border: 'border-emerald-200',
        titleColor: 'text-emerald-900',
        subtitleColor: 'text-emerald-700',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
      };
    } else if (comfortScore < COMFORT_THRESHOLDS.moderate) {
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
          if (trimmed) setAiRecommendation(trimmed);
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

  // ── Route request handler ───────────────────────────────────────────
  const handleRouteRequest = async () => {
    const target = nearestFood.id && nearestFood.id !== '--' ? nearestFood.id : 'S12';
    setRouting(true);
    navigate(`/map?dest=${encodeURIComponent(target)}`);
    setTimeout(() => setRouting(false), 250);
  };

  return (
    <div className="min-h-screen bg-stone-50 px-5 pt-12 font-sans flex flex-col">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex justify-between items-start mb-6 gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">FlowState</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            RCB vs CSK — Chinnaswamy Stadium
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 shrink-0 mt-1">
          <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-600">Live</span>
          </div>
          <button
            type="button"
            onClick={() => signOut()}
            className="text-xs font-semibold text-gray-500 hover:text-gray-800 underline underline-offset-2"
          >
            Sign out
          </button>
        </div>
      </header>

      {/* ── Comfort Gauge ──────────────────────────────────────────── */}
      <section className="text-center mb-6">
        <ComfortGaugeHero value={comfortScore} />
        <p className="text-sm font-medium text-gray-700 mt-1">
          Your section comfort score
        </p>
        <p className="text-xs font-semibold mt-1" style={{ color: comfortColor }}>
          {predictionText}
        </p>
      </section>

      {/* ── AI Action Card ─────────────────────────────────────────── */}
      {isEgress && (
        <section className="mb-4 rounded-2xl border border-blue-300 bg-blue-50 px-4 py-3">
          <p className="text-sm font-semibold text-blue-900">
            Match over. Your exit choreography is ready. Open the
            {' '}
            <span className="font-extrabold">Egress</span>
            {' '}
            tab below.
          </p>
        </section>
      )}

      <section
        className={`mb-6 rounded-2xl p-4 bg-gradient-to-br ${fallbackAction.bg} border ${fallbackAction.border} cursor-pointer active:scale-[0.98] transition-transform`}
        onClick={fallbackAction.type === 'food' ? handleRouteRequest : undefined}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${fallbackAction.iconBg} mt-0.5`}>
            <ArrowUp size={18} className={fallbackAction.iconColor} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className={`font-bold text-base ${fallbackAction.titleColor}`}>
                {fallbackAction.title}
              </h3>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 bg-violet-100 px-2 py-1 rounded-full">
                <Sparkles size={10} />
                AI-powered
              </span>
            </div>
            <p className={`text-sm ${fallbackAction.subtitleColor} mt-1 leading-relaxed`}>
              {routing ? 'Calculating optimal route…' : aiRecommendation || fallbackAction.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats Row ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          value={nearestFood.waitTime != null ? `${Math.round(nearestFood.waitTime)}m` : '—'}
          label="NEAREST FOOD"
          color="#22C55E"
        />
        <StatCard
          value={`${crowdLevel}%`}
          label="CROWD LEVEL"
          color="#3B82F6"
        />
        <StatCard
          value={activeRouteCount}
          label="ACTIVE ROUTES"
          color="#F59E0B"
        />
      </section>

      {/* ── Quick Nav ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-4 gap-3 mb-6">
        <QuickNavBtn
          icon={<Map size={22} />}
          label="Map"
          onClick={() => navigate('/map')}
          bg="bg-blue-50"
          iconColor="text-blue-500"
        />
        <QuickNavBtn
          icon={<UtensilsCrossed size={22} />}
          label="Food"
          onClick={() => navigate(`/map?dest=${encodeURIComponent(nearestFood.id !== '--' ? nearestFood.id : 'S12')}`)}
          bg="bg-red-50"
          iconColor="text-red-400"
        />
        <QuickNavBtn
          icon={<Users size={22} />}
          label="Group"
          onClick={() => navigate('/group')}
          bg="bg-orange-50"
          iconColor="text-orange-400"
        />
        <QuickNavBtn
          icon={<Star size={22} />}
          label="Rewards"
          onClick={() => navigate('/rewards')}
          bg="bg-amber-50"
          iconColor="text-amber-500"
        />
      </section>

      {/* ── Incentive Card ────────────────────────────────────────────── */}
      <section className="mb-6 space-y-3">
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 bg-amber-50 px-2 py-0.5 rounded-md">
              Targeted Offer
            </span>
            <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')} min left
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            <div className="p-2 bg-gray-50 rounded-full shrink-0">
              <span className="text-lg">🎯</span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-gray-900 text-sm truncate">
                2x points at {nearestFood.id !== '--' ? nearestFood.id : 'nearest stand'}
              </h4>
              <p className="text-xs text-gray-500 mt-0.5">
                <span className="font-bold text-emerald-600">+50 pts</span>
                {' '}
                • ~{promoWalkMeters}m walk est.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleRouteRequest()}
              className="bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold py-2 px-5 rounded-xl transition-colors active:scale-95 shadow-sm disabled:opacity-60"
              disabled={routing}
            >
              Go
            </button>
          </div>
        </div>
      </section>

      <BottomNav />
    </div>
  );
};
