import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useStore } from '../store/useStore';
import { BottomNav } from '../components/ui/BottomNav';
import { Toast } from '../components/ui/Toast';
import { getEgressPlan, getGroupGateAssignments } from '../intelligence/egressChoreographer';
import { GATE_BY_ID } from '../models/venueLayout';
import { DoorOpen, Clock3, CarFront, Coffee, Check, Sparkles } from 'lucide-react';
import { getSimStats } from '../simulation/crowdSimulator';
import { generateEgressTip } from '../services/geminiService';

const GROUP_MEMBERS = [
  { id: 'You', name: 'You', initials: 'You', color: 'bg-blue-100 text-blue-700' },
  { id: 'AK', name: 'Arjun K', initials: 'AK', color: 'bg-rose-100 text-rose-700' },
  { id: 'RS', name: 'Riya S', initials: 'RS', color: 'bg-amber-100 text-amber-700' },
  { id: 'PV', name: 'Pradeep V', initials: 'PV', color: 'bg-emerald-100 text-emerald-700' },
];

function formatMmSs(totalSeconds) {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatClockOffset(secondsFromNow) {
  const d = new Date(Date.now() + Math.max(0, secondsFromNow) * 1000);
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function EgressPage() {
  const currentFan = useStore((s) => s.currentFan);
  const simState = useStore((s) => s.simState);
  const [claimed, setClaimed] = useState(false);
  const [toast, setToast] = useState(null);
  const [simStats, setSimStats] = useState(() => getSimStats());
  const [aiTip, setAiTip] = useState('');
  const requestedTipRef = useRef(false);

  const plan = useMemo(
    () => getEgressPlan(currentFan?.id || 'fan-1', { zoneId: currentFan?.location }),
    [currentFan?.id, currentFan?.location],
  );

  useEffect(() => {
    const timer = setInterval(() => setSimStats(getSimStats()), 250);
    return () => clearInterval(timer);
  }, []);

  const postMatchElapsedSecs = simState?.postMatchElapsedSecs ?? 0;
  const remainingSecs = Math.max(0, plan.departureTime - postMatchElapsedSecs);
  const isGoNow = remainingSecs <= 0;
  const totalCountdownSecs = Math.max(1, plan.departureTime || 120);
  const progress = 1 - remainingSecs / totalCountdownSecs;

  const ringRadius = 52;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringDashOffset = ringCircumference * (1 - Math.max(0, Math.min(1, progress)));

  const groupGates = getGroupGateAssignments();
  const myGate = plan.gate;
  const departedPct = Math.round(((simStats?.exitedCount || 0) / Math.max(1, simStats?.total || 1)) * 100);
  const fallbackTip = `Your exit route through ${myGate} is optimized for your group. Smart timing beats rushing.`;

  useEffect(() => {
    if (requestedTipRef.current) return;
    requestedTipRef.current = true;

    let isMounted = true;

    const timeout = setTimeout(() => {
      if (isMounted) setAiTip(fallbackTip);
    }, 8000);

    generateEgressTip({
      fanZone: currentFan?.location || 'B4-B6',
      assignedGate: myGate,
      wave: `T+${Math.round(plan.departureTime || 0)}s`,
      groupMembers: GROUP_MEMBERS.map((member) => member.name),
      congestionSavings: 78,
    })
      .then((text) => {
        if (!isMounted) return;
        const trimmed = typeof text === 'string' ? text.trim() : '';
        setAiTip(trimmed || fallbackTip);
      })
      .catch(() => {
        if (!isMounted) return;
        setAiTip(fallbackTip);
      })
      .finally(() => clearTimeout(timeout));

    return () => {
      isMounted = false;
      clearTimeout(timeout);
    };
  }, [currentFan?.location, myGate, plan.departureTime, fallbackTip]);

  const handleClaim = () => {
    if (claimed) return;
    setClaimed(true);
    setToast({ message: 'Free coffee voucher added! Show this at Stand 5', type: 'success' });
  };

  return (
    <div className="min-h-screen bg-stone-50 px-5 pt-10 pb-3 font-sans flex flex-col">
      <header className="mb-5">
        <h1 className="text-[30px] leading-tight font-extrabold text-gray-900">Match ended - RCB won!</h1>
        <p className="text-sm text-gray-600 font-medium mt-1">Your personalized exit plan is ready</p>
      </header>

      <section className="flex flex-col items-center mb-5">
        <div className="relative w-[120px] h-[120px]">
          <svg className="w-[120px] h-[120px] -rotate-90" viewBox="0 0 120 120" aria-hidden>
            <circle cx="60" cy="60" r={ringRadius} stroke="#E5E7EB" strokeWidth="10" fill="none" />
            <circle
              cx="60"
              cy="60"
              r={ringRadius}
              stroke="#10B981"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={ringCircumference}
              strokeDashoffset={ringDashOffset}
              className="transition-[stroke-dashoffset] duration-500 ease-linear"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-5xl font-extrabold text-gray-900 leading-none">{formatMmSs(remainingSecs)}</p>
            <p className="text-sm text-gray-500 font-medium mt-1">minutes</p>
          </div>
        </div>
        <p className={`mt-4 text-center font-semibold ${isGoNow ? 'text-emerald-700 animate-pulse' : 'text-emerald-700'}`}>
          {isGoNow ? `Go now! Head to ${myGate}` : 'Your optimal exit window opens soon'}
        </p>
      </section>

      <section className="bg-[#F0F0EB] rounded-2xl p-4 space-y-3 mb-4 border border-gray-200">
        <InfoRow
          icon={<DoorOpen size={18} className="text-emerald-700" />}
          label="Assigned gate"
          value={`${myGate} - ${GATE_BY_ID[myGate]?.shortLabel || 'South'} exit`}
        />
        <InfoRow
          icon={<Clock3 size={18} className="text-amber-700" />}
          label="Estimated exit time"
          value={`${formatClockOffset(remainingSecs + 240)} - 4 min walk to parking`}
        />
        <InfoRow
          icon={<CarFront size={18} className="text-violet-700" />}
          label="Parking location"
          value="Lot P2, Row D - directions ready"
        />
      </section>

      <section className="rounded-2xl border-2 border-blue-500 bg-white p-4 mb-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
            <Coffee size={18} className="text-blue-700" />
          </div>
          <div className="flex-1">
            <p className="text-3xl leading-tight font-extrabold text-gray-900">Wait 3 min, skip the chaos</p>
            <p className="text-sm text-gray-600 mt-1">
              Free coffee at Stand 5 (20m away). Leave at your scheduled time and avoid 78% of exit congestion.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClaim}
            className={`shrink-0 rounded-xl px-4 py-2 text-sm font-bold border transition-colors ${
              claimed
                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {claimed ? (
              <span className="inline-flex items-center gap-1">
                <Check size={14} />
                Claimed!
              </span>
            ) : (
              'Claim'
            )}
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-violet-200 bg-violet-50 p-4 mb-4">
        <div className="flex items-start gap-2">
          <Sparkles size={16} className="text-violet-700 mt-0.5 shrink-0" />
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-violet-700">AI tip</p>
            <p className="text-sm text-violet-900 mt-1 leading-relaxed">{aiTip || fallbackTip}</p>
          </div>
        </div>
      </section>

      <section className="bg-[#F0F0EB] rounded-2xl p-4 mb-4 border border-gray-200">
        <p className="text-xs tracking-wider font-bold text-gray-600 mb-3">GROUP EXIT SYNC</p>
        <div className="space-y-2">
          {GROUP_MEMBERS.map((member) => {
            const gate = groupGates[member.id] || myGate;
            const sameAsYou = gate === myGate;
            return (
              <div key={member.id} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center ${member.color}`}>
                    {member.initials}
                  </div>
                  <span className="text-sm font-semibold text-gray-900 truncate">{member.name}</span>
                </div>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded-full ${
                    sameAsYou ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  Gate {gate.replace('G', '')}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mb-3">
        <div className="flex justify-between text-sm font-medium text-gray-600 mb-1">
          <span>Venue exit progress</span>
          <span>{departedPct}% departed</span>
        </div>
        <div className="h-2.5 rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-[width] duration-700 ease-out rounded-full"
            style={{ width: `${Math.min(100, Math.max(0, departedPct))}%` }}
          />
        </div>
      </section>

      <BottomNav />

      {toast && <Toast key={toast.message} message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function InfoRow({ icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center mt-0.5">{icon}</div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500 font-bold">{label}</p>
        <p className="text-lg font-bold text-gray-900 leading-tight">{value}</p>
      </div>
    </div>
  );
}
