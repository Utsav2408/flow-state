import React, { useEffect, useRef, useState } from 'react';
import { getComfortColor } from '../intelligence/comfortScoring';
import { formatTimeAgo } from './operatorMetrics';

export const OperatorToast = ({ message, visible }) => (
  <div
    style={{
      position: 'fixed',
      bottom: 88,
      left: '50%',
      transform: `translateX(-50%) translateY(${visible ? '0' : '30px'})`,
      opacity: visible ? 1 : 0,
      background: '#0F172A',
      color: '#fff',
      padding: '10px 24px',
      borderRadius: 12,
      fontSize: 14,
      fontWeight: 600,
      boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
      transition: 'all 0.35s cubic-bezier(.4,0,.2,1)',
      zIndex: 9999,
      pointerEvents: 'none',
      whiteSpace: 'nowrap',
      letterSpacing: '0.01em',
    }}
  >
    <span style={{ marginRight: 8 }}>⚡</span>
    {message}
  </div>
);

export const AlertFeed = ({ alerts }) => {
  const scrollRef = useRef(null);
  const topKey =
    alerts.length > 0 ? `${alerts[0].timestamp ?? ''}\0${alerts[0].message ?? ''}` : '';
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [topKey, alerts.length]);

  const dotColor = { red: '#EF4444', amber: '#F59E0B', green: '#22C55E', blue: '#3B82F6' };

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1,
        overflowY: 'auto',
        maxHeight: 200,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        scrollBehavior: 'smooth',
      }}
    >
      {alerts.length === 0 && (
        <div style={{ color: '#94A3B8', fontSize: 13, padding: '8px 0' }}>No alerts yet.</div>
      )}
      {alerts.map((a, i) => (
        <div
          key={`${a.timestamp}-${i}`}
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: 10,
            padding: '8px 12px',
            borderRadius: 10,
            background:
              a.severity === 'red'
                ? 'rgba(239,68,68,0.07)'
                : a.severity === 'amber'
                  ? 'rgba(245,158,11,0.07)'
                  : a.severity === 'green'
                    ? 'rgba(34,197,94,0.07)'
                    : 'rgba(59,130,246,0.07)',
            borderLeft: `3px solid ${dotColor[a.severity] || '#CBD5E1'}`,
            animation: i === 0 ? 'alertSlideIn 0.3s ease-out' : 'none',
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: dotColor[a.severity] || '#CBD5E1',
              marginTop: 4,
              flexShrink: 0,
            }}
          />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#1E293B', fontWeight: 500, lineHeight: 1.4 }}>
              {a.message}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>
              {a.timeLabel || formatTimeAgo(a.timestamp)}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export const MetricCard = ({ label, value, sub, subColor = '#22C55E' }) => (
  <div
    style={{
      background: '#fff',
      borderRadius: 14,
      padding: '16px 18px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
      minWidth: 0,
    }}
  >
    <div
      style={{
        fontSize: 10,
        fontWeight: 700,
        color: '#94A3B8',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
      }}
    >
      {label}
    </div>
    <div
      style={{
        fontSize: 28,
        fontWeight: 800,
        color: '#0F172A',
        lineHeight: 1.15,
        transition: 'all 0.6s cubic-bezier(.4,0,.2,1)',
      }}
    >
      {value}
    </div>
    <div
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: subColor,
        transition: 'color 0.4s ease',
      }}
    >
      {sub}
    </div>
  </div>
);

export const SpeedBtn = ({ label, active, onClick }) => (
  <button
    id={`speed-${label}`}
    type="button"
    onClick={onClick}
    style={{
      flex: 1,
      padding: '10px 0',
      borderRadius: 10,
      border: 'none',
      cursor: 'pointer',
      fontWeight: 700,
      fontSize: 14,
      background: active ? '#0F172A' : '#F1F5F9',
      color: active ? '#fff' : '#64748B',
      transition: 'all 0.18s',
      boxShadow: active ? '0 2px 8px rgba(15,23,42,0.18)' : 'none',
    }}
  >
    {label}
  </button>
);

export const EventBtn = ({ id, label, color, onClick, selected, pulse }) => {
  const [hover, setHover] = useState(false);
  const bg = selected ? `${color}28` : pulse ? `${color}42` : hover ? `${color}20` : `${color}0d`;
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
      style={{
        width: '100%',
        padding: '11px 0',
        borderRadius: 12,
        border,
        background: bg,
        color,
        fontWeight: 700,
        fontSize: 14,
        cursor: 'pointer',
        letterSpacing: '0.01em',
        transition:
          'background 0.2s, transform 0.1s, box-shadow 0.25s, border-color 0.2s',
        boxShadow: shadow,
        animation: pulse ? 'eventBtnPulse 1s ease-out' : 'none',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.97)';
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
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
    <div
      style={{
        width: '100%',
        height: 200,
        border: '2.5px solid #1E293B',
        borderRadius: 20,
        background: '#FAFAF9',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        boxShadow: '0 4px 20px rgba(0,0,0,0.12), inset 0 0 0 1px rgba(255,255,255,0.5)',
      }}
    >
      <div
        style={{
          height: 16,
          background: '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 3,
        }}
      >
        <div style={{ width: 24, height: 3, borderRadius: 2, background: '#475569' }} />
      </div>

      <div
        style={{
          flex: 1,
          padding: '6px 8px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            fontSize: 7,
            fontWeight: 800,
            color: '#0F172A',
            letterSpacing: '-0.02em',
            width: '100%',
            textAlign: 'left',
          }}
        >
          FlowState
        </div>

        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
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
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              fontSize: 12,
              fontWeight: 800,
              color: comfortColor,
              lineHeight: 1,
            }}
          >
            {comfortScore}
          </div>
        </div>
        <div style={{ fontSize: 6, color: '#64748B', fontWeight: 600, marginTop: -2 }}>
          Comfort Score
        </div>

        <div
          style={{
            width: '100%',
            background: 'rgba(16,185,129,0.08)',
            border: '1px solid rgba(16,185,129,0.2)',
            borderRadius: 6,
            padding: '4px 6px',
          }}
        >
          <div style={{ fontSize: 6, fontWeight: 700, color: '#065F46', lineHeight: 1.3 }}>
            {aiActionTitle || "You're in a great spot"}
          </div>
          <div style={{ fontSize: 5, color: '#059669', marginTop: 1 }}>Tap to navigate →</div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: 3,
            width: '100%',
          }}
        >
          {[
            { val: `${nearestWait}m`, label: 'Food', color: '#22C55E' },
            { val: `${crowdLevel}%`, label: 'Crowd', color: '#3B82F6' },
            { val: activeRouteCount, label: 'Routes', color: '#F59E0B' },
          ].map((s) => (
            <div
              key={s.label}
              style={{
                background: '#fff',
                borderRadius: 4,
                padding: '3px 2px',
                textAlign: 'center',
                border: '0.5px solid #E2E8F0',
              }}
            >
              <div
                style={{
                  fontSize: 8,
                  fontWeight: 800,
                  color: s.color,
                  lineHeight: 1.2,
                  transition: 'all 0.5s ease',
                }}
              >
                {s.val}
              </div>
              <div style={{ fontSize: 5, color: '#94A3B8', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          height: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          background: '#fff',
          borderTop: '0.5px solid #E2E8F0',
        }}
      >
        {['○', '□', '△'].map((s, i) => (
          <span key={i} style={{ fontSize: 5, color: '#94A3B8' }}>
            {s}
          </span>
        ))}
      </div>
    </div>
  );
};

export const FlowStateLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span
      style={{
        fontSize: 18,
        fontWeight: 800,
        letterSpacing: '-0.02em',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
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
    <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>operator dashboard</span>
  </div>
);
