import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getComfortColor } from '../../intelligence/comfortScoring';
import { BottomNav } from '../../components/ui/BottomNav';
import { useAuth } from '../../auth/useAuth';
import { Map, UtensilsCrossed, Users, Star, ArrowUp, Sparkles } from 'lucide-react';
import { useHomePageState } from './useHomePageState';

// ─── Comfort Gauge (Hero) ──────────────────────────────────────────────────
const ComfortGaugeHero = ({ value }) => {
  const color = getComfortColor(value);
  const size = 200;
  const ctr = size / 2;
  const r = 80;
  const sw = 12;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75; // 270° arc
  const off = arc * (1 - value / 100); // dashoffset for fill level

  return (
    <div className="relative mx-auto flex h-[200px] w-[200px] items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={ctr}
          cy={ctr}
          r={r}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={sw}
          strokeDasharray={`${arc} ${circ}`}
          strokeLinecap="round"
          transform={`rotate(135 ${ctr} ${ctr})`}
        />
        {/* Animated value arc */}
        <circle
          cx={ctr}
          cy={ctr}
          r={r}
          fill="none"
          stroke={color}
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
    <span className="text-2xl font-extrabold" style={{ color }}>
      {value}
    </span>
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
  const {
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
  } = useHomePageState(navigate);
  const [liveUpdate, setLiveUpdate] = useState('');
  const prevComfortRef = useRef(comfortScore);

  useEffect(() => {
    if (Math.abs(comfortScore - prevComfortRef.current) >= 5) {
      setLiveUpdate(`Comfort score updated to ${comfortScore}. Crowd level is ${crowdLevel} percent.`);
      prevComfortRef.current = comfortScore;
    }
  }, [comfortScore, crowdLevel]);

  return (
    <div className="h-screen bg-stone-50 font-sans flex flex-col">
      <main id="main-content" className="flex-1 min-h-0 overflow-y-auto px-5 pt-12" aria-label="Home content">
        {/* ── Header ─────────────────────────────────────────────────── */}
        <header className="flex justify-between items-start mb-6 gap-3">
          <div className="min-w-0">
            <h1 data-page-heading className="text-3xl font-extrabold text-gray-900 tracking-tight">
              FlowState
            </h1>
            <p className="text-sm text-gray-500 font-medium mt-0.5">RCB vs CSK — Chinnaswamy Stadium</p>
          </div>
          <div className="flex flex-col items-end gap-2 shrink-0 mt-1">
            <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1">
              <span className="w-2 h-2 rounded-full bg-red-500 motion-safe:animate-pulse" />
              <span className="text-xs font-bold text-red-600">Live</span>
            </div>
            <button
              type="button"
              onClick={() => signOut()}
              className="min-h-11 min-w-11 text-xs font-semibold text-gray-500 hover:text-gray-800 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
            >
              Sign out
            </button>
          </div>
        </header>

        {/* ── Comfort Gauge ──────────────────────────────────────────── */}
        <section className="text-center mb-6">
          <ComfortGaugeHero value={comfortScore} />
          <p className="text-sm font-medium text-gray-700 mt-1">Your section comfort score</p>
          <p className="text-xs font-semibold mt-1" style={{ color: comfortColor }}>
            {predictionText}
          </p>
        </section>

        {/* ── AI Action Card ─────────────────────────────────────────── */}
        {isEgress && (
          <section className="mb-4 rounded-2xl border border-blue-300 bg-blue-50 px-4 py-3">
            <p className="text-sm font-semibold text-blue-900">
              Match over. Your exit choreography is ready. Open the <span className="font-extrabold">Egress</span>{' '}
              tab below.
            </p>
          </section>
        )}

        <section
          className={`mb-6 rounded-2xl p-4 bg-gradient-to-br ${fallbackAction.bg} border ${fallbackAction.border}`}
        >
          <div className="flex items-start gap-3">
            {fallbackAction.type === 'food' ? (
              <button
                type="button"
                onClick={handleRouteRequest}
                className="w-full flex items-start gap-3 text-left cursor-pointer active:scale-[0.98] transition-transform rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-50"
              >
                <div className={`p-2 rounded-full ${fallbackAction.iconBg} mt-0.5`}>
                  <ArrowUp size={18} className={fallbackAction.iconColor} aria-hidden />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-base ${fallbackAction.titleColor}`}>
                      {fallbackAction.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 bg-violet-100 px-2 py-1 rounded-full">
                      <Sparkles size={10} aria-hidden />
                      AI-powered
                    </span>
                  </div>
                  <p className={`text-sm ${fallbackAction.subtitleColor} mt-1 leading-relaxed`}>
                    {routing ? 'Calculating optimal route…' : aiRecommendation || fallbackAction.subtitle}
                  </p>
                </div>
              </button>
            ) : (
              <>
                <div className={`p-2 rounded-full ${fallbackAction.iconBg} mt-0.5`}>
                  <ArrowUp size={18} className={fallbackAction.iconColor} aria-hidden />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`font-bold text-base ${fallbackAction.titleColor}`}>
                      {fallbackAction.title}
                    </h3>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-violet-700 bg-violet-100 px-2 py-1 rounded-full">
                      <Sparkles size={10} aria-hidden />
                      AI-powered
                    </span>
                  </div>
                  <p className={`text-sm ${fallbackAction.subtitleColor} mt-1 leading-relaxed`}>
                    {routing ? 'Calculating optimal route…' : aiRecommendation || fallbackAction.subtitle}
                  </p>
                </div>
              </>
            )}
          </div>
        </section>

        {/* ── Stats Row ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-3 gap-3 mb-6">
          <StatCard
            value={nearestFood.waitTime != null ? `${Math.round(nearestFood.waitTime)}m` : '—'}
            label="NEAREST FOOD"
            color="#22C55E"
          />
          <StatCard value={`${crowdLevel}%`} label="CROWD LEVEL" color="#3B82F6" />
          <StatCard value={activeRouteCount} label="ACTIVE ROUTES" color="#F59E0B" />
        </section>

        {/* ── Quick Nav ──────────────────────────────────────────────── */}
        <section className="grid grid-cols-4 gap-3 mb-6">
          <QuickNavBtn
            icon={<Map size={22} aria-hidden />}
            label="Map"
            onClick={() => navigate('/map')}
            bg="bg-blue-50"
            iconColor="text-blue-500"
          />
          <QuickNavBtn
            icon={<UtensilsCrossed size={22} aria-hidden />}
            label="Food"
            onClick={() => navigate(`/map?dest=${encodeURIComponent(nearestFood.id !== '--' ? nearestFood.id : 'S12')}`)}
            bg="bg-red-50"
            iconColor="text-red-400"
          />
          <QuickNavBtn
            icon={<Users size={22} aria-hidden />}
            label="Group"
            onClick={() => navigate('/group')}
            bg="bg-orange-50"
            iconColor="text-orange-400"
          />
          <QuickNavBtn
            icon={<Star size={22} aria-hidden />}
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
                  <span className="font-bold text-emerald-600">+50 pts</span> • ~{promoWalkMeters}m walk est.
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
        <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
          {liveUpdate}
        </p>
      </main>

      <BottomNav />
    </div>
  );
};
