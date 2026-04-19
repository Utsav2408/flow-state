import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { getComfortScore, getComfortColor } from '../intelligence/comfortScoring';
import { requestRoute, getNashStats } from '../intelligence/routingEngine';
import { BottomNav } from '../components/Shared';
import { Map, UtensilsCrossed, Users, Star, ArrowUp } from 'lucide-react';

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
  const currentFan = useStore(s => s.currentFan);
  const zones = useStore(s => s.zones);
  const stands = useStore(s => s.stands);
  const setActiveRoute = useStore(s => s.setActiveRoute);

  const [routing, setRouting] = useState(false);

  const zoneId = currentFan?.location || 'B4-B6';

  // ── Comfort score (reactive via Zustand) ────────────────────────────
  const comfortScore = useMemo(() => getComfortScore(zoneId), [zones, stands, zoneId]);
  const comfortColor = getComfortColor(comfortScore);

  // ── Nearest food stand ──────────────────────────────────────────────
  const nearestFood = useMemo(() => {
    let best = { id: '--', waitTime: 99 };
    stands.forEach((s, id) => {
      if (s.waitTime !== undefined && s.waitTime < best.waitTime) {
        best = { id, waitTime: s.waitTime };
      }
    });
    return best;
  }, [stands]);

  // ── Average wait across all stands ──────────────────────────────────
  const avgWait = useMemo(() => {
    let total = 0, cnt = 0;
    stands.forEach(s => { if (s.waitTime !== undefined) { total += s.waitTime; cnt++; } });
    return cnt > 0 ? Math.round(total / cnt) : 0;
  }, [stands]);

  // ── Crowd level (fan's zone group density) ──────────────────────────
  const crowdLevel = useMemo(() => {
    const aliases = {
      'A1-A4': ['A1','A2','A3','A4'],
      'B1-B3': ['B1','B2','B3'],
      'B4-B6': ['B4','B5','B6'],
      'C1-C3': ['C1','C2','C3'],
      'C4-C6': ['C4','C5','C6'],
      'D1-D3': ['D1','D2','D3'],
    };
    const group = aliases[zoneId] || [];
    let total = 0, cnt = 0;
    group.forEach(z => {
      const d = zones.get(z);
      if (d?.density !== undefined) { total += d.density; cnt++; }
    });
    return cnt > 0 ? Math.round(total / cnt) : 0;
  }, [zones, zoneId]);

  // ── Active route count ──────────────────────────────────────────────
  const activeRouteCount = useMemo(() => {
    const stats = getNashStats();
    return stats.totalRoutes || 0;
  }, [zones]); // Re-derive when zones update

  // ── Prediction text ─────────────────────────────────────────────────
  const predictionText = useMemo(() => {
    const section = zoneId.split('-')[0];
    if (comfortScore >= 70) return `Section ${section} — looking good for 15 min`;
    if (comfortScore >= 50) return `Section ${section} — moderate crowd expected`;
    return `Section ${section} — consider moving soon`;
  }, [comfortScore, zoneId]);

  // ── AI Action Card logic ────────────────────────────────────────────
  const aiAction = useMemo(() => {
    if (nearestFood.waitTime < 3) {
      return {
        type: 'food',
        title: 'Grab food now — ideal window',
        subtitle: `Stand ${nearestFood.id.replace('S', '')} has a ${nearestFood.waitTime} min wait (vs ${avgWait} min avg). Route avoids halftime rush. Tap to navigate.`,
        bg: 'from-emerald-600/10 to-teal-500/10',
        border: 'border-emerald-200',
        titleColor: 'text-emerald-900',
        subtitleColor: 'text-emerald-700',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
      };
    } else if (comfortScore < 50) {
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

  // ── Route request handler ───────────────────────────────────────────
  const handleRouteRequest = async () => {
    setRouting(true);
    try {
      const result = await requestRoute(currentFan?.id || 'fan-1', 'food');
      if (result) {
        setActiveRoute(result);
        navigate('/map');
      }
    } finally {
      setRouting(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────
  return (
    <div className="pb-24 min-h-screen bg-stone-50 px-5 pt-12 font-sans">

      {/* ── Header ─────────────────────────────────────────────────── */}
      <header className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">FlowState</h1>
          <p className="text-sm text-gray-500 font-medium mt-0.5">
            RCB vs CSK — Chinnaswamy Stadium
          </p>
        </div>
        <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 rounded-full px-3 py-1 mt-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-xs font-bold text-red-600">Live</span>
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
      <section
        className={`mb-6 rounded-2xl p-4 bg-gradient-to-br ${aiAction.bg} border ${aiAction.border} cursor-pointer active:scale-[0.98] transition-transform`}
        onClick={aiAction.type === 'food' ? handleRouteRequest : undefined}
      >
        <div className="flex items-start gap-3">
          <div className={`p-2 rounded-full ${aiAction.iconBg} mt-0.5`}>
            <ArrowUp size={18} className={aiAction.iconColor} />
          </div>
          <div className="flex-1">
            <h3 className={`font-bold text-base ${aiAction.titleColor}`}>
              {aiAction.title}
            </h3>
            <p className={`text-sm ${aiAction.subtitleColor} mt-1 leading-relaxed`}>
              {routing ? 'Calculating optimal route…' : aiAction.subtitle}
            </p>
          </div>
        </div>
      </section>

      {/* ── Stats Row ──────────────────────────────────────────────── */}
      <section className="grid grid-cols-3 gap-3 mb-6">
        <StatCard
          value={`${nearestFood.waitTime}m`}
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
          onClick={() => navigate('/map')}
          bg="bg-red-50"
          iconColor="text-red-400"
        />
        <QuickNavBtn
          icon={<Users size={22} />}
          label="Group"
          onClick={() => navigate('/map')}
          bg="bg-orange-50"
          iconColor="text-orange-400"
        />
        <QuickNavBtn
          icon={<Star size={22} />}
          label="Rewards"
          onClick={() => navigate('/map')}
          bg="bg-amber-50"
          iconColor="text-amber-500"
        />
      </section>

      {/* ── Reward Card ────────────────────────────────────────────── */}
      <section className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-50 rounded-full">
            <Star size={20} className="text-amber-500" />
          </div>
          <div className="flex-1">
            <h4 className="font-bold text-gray-900 text-sm">Visit Stand 12 for 2x points</h4>
            <p className="text-xs text-gray-500">Only 90m away — expires in 8 min</p>
          </div>
          <span className="text-sm font-bold text-emerald-600">+50 pts</span>
        </div>
      </section>

      <BottomNav />
    </div>
  );
};
