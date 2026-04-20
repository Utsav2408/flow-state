import React from 'react';
import { getComfortColor } from '../intelligence/comfortScoring';
import { formatTimeAgo } from './operatorMetrics';

export const OperatorToast = ({ message, visible }) => (
  <div
    className="pointer-events-none fixed bottom-[88px] left-1/2 z-[9999] whitespace-nowrap rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-semibold tracking-[0.01em] text-white shadow-[0_8px_32px_rgba(0,0,0,0.25)] transition-all duration-300"
    style={{
      transform: `translateX(-50%) translateY(${visible ? '0' : '30px'})`,
      opacity: visible ? 1 : 0,
    }}
  >
    <span className="mr-2">⚡</span>
    {message}
  </div>
);

export const AlertFeed = ({ alerts }) => {
  const tones = {
    red: { bg: 'rgba(239,68,68,0.07)', border: '#EF4444' },
    amber: { bg: 'rgba(245,158,11,0.07)', border: '#F59E0B' },
    green: { bg: 'rgba(34,197,94,0.07)', border: '#22C55E' },
    blue: { bg: 'rgba(59,130,246,0.07)', border: '#3B82F6' },
  };

  return (
    <div className="box-border flex w-full flex-col gap-1.5">
      {alerts.length === 0 && (
        <div className="py-2 text-[13px] text-slate-400">No alerts yet.</div>
      )}
      {alerts.map((a, i) => (
        <div
          key={`${a.timestamp}-${i}`}
          className="flex items-start gap-2.5 rounded-[10px] px-3 py-2"
          style={{
            background: tones[a.severity]?.bg || 'rgba(148,163,184,0.08)',
            borderLeft: `3px solid ${tones[a.severity]?.border || '#CBD5E1'}`,
            animation: i === 0 ? 'alertSlideIn 0.3s ease-out' : 'none',
          }}
        >
          <span
            className="mt-1 h-2 w-2 shrink-0 rounded-full"
            style={{
              background: tones[a.severity]?.border || '#CBD5E1',
            }}
          />
          <div className="flex-1">
            <div className="text-[13px] font-medium leading-snug text-slate-800">
              {a.message}
            </div>
            <div className="mt-0.5 text-[11px] text-slate-400">
              {a.timeLabel || formatTimeAgo(a.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const MetricCard = ({ label, value, sub, subColor = '#22C55E' }) => (
  <div className="flex min-w-0 flex-col gap-1 rounded-[14px] bg-white px-[18px] py-4 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
    <div className="text-[10px] font-bold uppercase tracking-[0.08em] text-slate-400">
      {label}
    </div>
    <div className="text-[28px] font-extrabold leading-[1.15] text-slate-900 transition-all duration-500">
      {value}
    </div>
    <div className="text-xs font-semibold transition-colors duration-300" style={{ color: subColor }}>
      {sub}
    </div>
  </div>
);

export const SpeedBtn = ({ label, active, onClick }) => (
  <button
    id={`speed-${label}`}
    type="button"
    onClick={onClick}
    className={`flex-1 rounded-[10px] py-2.5 text-sm font-bold transition-all ${
      active
        ? 'bg-slate-900 text-white shadow-[0_2px_8px_rgba(15,23,42,0.18)]'
        : 'bg-slate-100 text-slate-500'
    }`}
    style={{
      border: 'none',
    }}
  >
    {label}
  </button>
);

export const EventBtn = ({ id, label, color, onClick, selected, pulse }) => {
  const bg = selected ? `${color}28` : pulse ? `${color}42` : `${color}12`;
  const border = selected ? `2px solid ${color}` : `1.5px solid ${color}33`;
  const shadow = selected
    ? `0 0 0 3px ${color}28, 0 3px 10px ${color}22`
    : pulse
      ? `0 0 20px ${color}55, 0 0 0 1px ${color}44`
      : 'none';

  return (
    <button
      id={id}
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className="w-full rounded-xl py-[11px] text-sm font-bold tracking-[0.01em] transition-all active:scale-[0.97]"
      style={{
        border,
        background: bg,
        color,
        boxShadow: shadow,
        animation: pulse ? 'eventBtnPulse 1s ease-out' : 'none',
      }}
    >
      {label}
    </button>
  );
};

export const FanAppPreview = ({
  comfortScore,
  nearestWait,
  crowdLevel,
  activeRouteCount,
  aiActionTitle,
  matchPhase,
}) => {
  const comfortColor = getComfortColor(comfortScore);
  const size = 50;
  const ctr = size / 2;
  const r = 18;
  const sw = 4;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const off = arc * (1 - comfortScore / 100);

  return (
    <div className="relative flex h-[200px] w-full flex-col overflow-hidden rounded-[20px] border-[2.5px] border-slate-800 bg-stone-50 shadow-[0_4px_20px_rgba(0,0,0,0.12),inset_0_0_0_1px_rgba(255,255,255,0.5)]">
      <div className="flex h-4 items-center justify-center gap-[3px] bg-slate-900">
        <div className="h-[3px] w-6 rounded bg-slate-600" />
      </div>

      <div className="flex flex-1 flex-col items-center gap-1 overflow-hidden px-2 py-1.5">
        <div className="w-full text-left text-[7px] font-extrabold tracking-[-0.02em] text-slate-900">
          FlowState
        </div>

        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
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
            <circle
              cx={ctr}
              cy={ctr}
              r={r}
              fill="none"
              stroke={comfortColor}
              strokeWidth={sw}
              strokeDasharray={`${arc} ${circ}`}
              strokeDashoffset={off}
              strokeLinecap="round"
              transform={`rotate(135 ${ctr} ${ctr})`}
              style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s' }}
            />
          </svg>
          <div
            className="absolute left-1/2 top-1/2 text-xs font-extrabold leading-none"
            style={{
              transform: 'translate(-50%, -50%)',
              color: comfortColor,
            }}
          >
            {comfortScore}
          </div>
        </div>
        <div className="-mt-0.5 text-[6px] font-semibold text-slate-500">
          Comfort Score
        </div>

        <div className="w-full rounded-md border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-1">
          <div className="text-[6px] font-bold leading-tight text-emerald-900">
            {matchPhase === 'post_match'
              ? 'Match over! Exit plan ready'
              : aiActionTitle || "You're in a great spot"}
          </div>
          <div className="mt-px text-[5px] text-emerald-600">
            {matchPhase === 'post_match' ? 'Countdown + gate assignment' : 'Tap to navigate ->'}
          </div>
        </div>

        <div className="grid w-full grid-cols-3 gap-[3px]">
          {[
            { val: `${nearestWait}m`, label: 'Food', color: '#22C55E' },
            { val: `${crowdLevel}%`, label: 'Crowd', color: '#3B82F6' },
            { val: activeRouteCount, label: 'Routes', color: '#F59E0B' },
          ].map((s) => (
            <div key={s.label} className="rounded bg-white px-0.5 py-[3px] text-center ring-[0.5px] ring-slate-200">
              <div
                className="text-[8px] font-extrabold leading-tight transition-all duration-500"
                style={{
                  color: s.color,
                }}
              >
                {s.val}
              </div>
              <div className="text-[5px] font-semibold text-slate-400">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex h-3 items-center justify-center gap-1 bg-white ring-[0.5px] ring-inset ring-slate-200">
        {['○', '□', '△'].map((s, i) => (
          <span key={i} className="text-[5px] text-slate-400">
            {s}
          </span>
        ))}
      </div>
    </div>
  );
};

export const FlowStateLogo = () => (
  <div className="flex items-center gap-2">
    <span className="flex items-center gap-1.5 text-[18px] font-extrabold tracking-[-0.02em] text-white">
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#38BDF8"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
      </svg>
      FlowState
    </span>
    <span className="text-[13px] font-medium text-slate-400">operator dashboard</span>
  </div>
);
