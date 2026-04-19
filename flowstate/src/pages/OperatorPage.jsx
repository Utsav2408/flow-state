import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { db, ref, set } from '../firebase';
import { startSimulation, triggerEvent, getSimStats } from '../simulation/crowdSimulator';
import { requestRoute, getNashStats } from '../intelligence/routingEngine';
import { getComfortColor } from '../intelligence/comfortScoring';

// ─── Constants ────────────────────────────────────────────────────────────────
const BASELINE_WAIT = 5.5; // minutes
const BASELINE_COMFORT = 66; // 0–100 score
const MAX_ALERTS = 20;

const MATCH_STATES = {
  pre_match: 'Pre-match',
  live_play: 'Live',
  halftime: 'Halftime',
  post_match: 'Post-match',
  goal: 'Live',
};

const MATCH_STATE_COLORS = {
  pre_match: '#6366f1',
  live_play: '#22c55e',
  halftime: '#f59e0b',
  post_match: '#94a3b8',
  goal: '#ef4444',
};

const ZONE_GROUPS = {
  'A1-A4': ['A1','A2','A3','A4'],
  'B1-B3': ['B1','B2','B3'],
  'B4-B6': ['B4','B5','B6'],
  'C1-C3': ['C1','C2','C3'],
  'C4-C6': ['C4','C5','C6'],
  'D1-D3': ['D1','D2','D3'],
};

// density 0-100 → comfort 0-100 (inverted)
function densityToComfort(density) {
  return Math.max(0, Math.min(100, Math.round(100 - density)));
}

function formatSimTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Toast Notification ────────────────────────────────────────────────────
const Toast = ({ message, visible }) => (
  <div style={{
    position: 'fixed',
    bottom: 32,
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
  }}>
    <span style={{ marginRight: 8 }}>⚡</span>{message}
  </div>
);

// Browser / GPU canvas backing-store limits — keeps resize loops from allocating absurd bitmaps
const MAX_CANVAS_CSS_PX = 4096;

// ─── Operator Venue Map Canvas ─────────────────────────────────────────────
const OperatorMapCanvas = ({ zones, stands }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef();
  const timeRef = useRef(0);
  const activeRoute = useStore(state => state.activeRoute);

  const logicalW = 800, logicalH = 600;
  const cx = logicalW / 2, cy = logicalH / 2;

  const zoneLocations = [
    { id: 'A1-A4', x: cx - 230, y: cy - 80, rx: 65, ry: 60, alias: ['A1','A2','A3','A4'] },
    { id: 'B1-B3', x: cx,        y: cy - 210, rx: 90, ry: 45, alias: ['B1','B2','B3'] },
    { id: 'B4-B6', x: cx + 230,  y: cy - 80, rx: 75, ry: 55, alias: ['B4','B5','B6'] },
    { id: 'C1-C3', x: cx + 230,  y: cy + 120, rx: 85, ry: 55, alias: ['C1','C2','C3'] },
    { id: 'C4-C6', x: cx,        y: cy + 210, rx: 95, ry: 45, alias: ['C4','C5','C6'] },
    { id: 'D1-D3', x: cx - 210,  y: cy + 120, rx: 75, ry: 55, alias: ['D1','D2','D3'] },
  ];

  const standPositions = [
    { id: 'S3',  x: cx - 110, y: cy - 170 },
    { id: 'S5',  x: cx - 150, y: cy + 30  },
    { id: 'S7',  x: cx + 140, y: cy - 170 },
    { id: 'S12', x: cx + 155, y: cy + 40  },
  ];

  const getNodeMapPos = (nodeId) => {
    const zm = {
      A1:'A1-A4',A2:'A1-A4',A3:'A1-A4',A4:'A1-A4',
      B1:'B1-B3',B2:'B1-B3',B3:'B1-B3',
      B4:'B4-B6',B5:'B4-B6',B6:'B4-B6',
      C1:'C1-C3',C2:'C1-C3',C3:'C1-C3',
      C4:'C4-C6',C5:'C4-C6',C6:'C4-C6',
      D1:'D1-D3',D2:'D1-D3',D3:'D1-D3',
    };
    const gid = zm[nodeId];
    if (gid) { const zl = zoneLocations.find(z => z.id === gid); if (zl) return { x: zl.x, y: zl.y }; }
    const sp = standPositions.find(s => s.id === nodeId);
    if (sp) return { x: sp.x, y: sp.y };
    return null;
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    const cssW = Math.min(MAX_CANVAS_CSS_PX, Math.max(1, Math.floor(rect.width)));
    const cssH = Math.min(MAX_CANVAS_CSS_PX, Math.max(1, Math.floor(rect.height)));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.floor(cssW * dpr);
    canvas.height = Math.floor(cssH * dpr);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, cssW, cssH);

    const scale = Math.min(cssW / logicalW, cssH / logicalH) * 0.95;
    const ox = (cssW - logicalW * scale) / 2;
    const oy = (cssH - logicalH * scale) / 2;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    // ── Subtle grid background ──
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.strokeStyle = '#64748B';
    ctx.lineWidth = 0.8;
    const gridSpacing = 40;
    for (let gx = 0; gx <= logicalW; gx += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, logicalH);
      ctx.stroke();
    }
    for (let gy = 0; gy <= logicalH; gy += gridSpacing) {
      ctx.beginPath();
      ctx.moveTo(0, gy);
      ctx.lineTo(logicalW, gy);
      ctx.stroke();
    }
    ctx.restore();

    // Stadium outer oval
    ctx.beginPath();
    ctx.ellipse(cx, cy, 360, 270, 0, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(248,247,244,0.85)';
    ctx.fill();
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Inner concourse ring
    ctx.beginPath();
    ctx.setLineDash([8, 8]);
    ctx.ellipse(cx, cy, 240, 175, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

    // Pitch
    ctx.beginPath();
    ctx.roundRect(cx - 90, cy - 65, 180, 130, 10);
    ctx.fillStyle = '#E8F5E9';
    ctx.fill();
    ctx.strokeStyle = '#A5D6A7';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#4CAF50';
    ctx.font = 'bold 14px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Pitch', cx, cy);

    // Heatmap blobs (vivid, clearly differentiated)
    const t = timeRef.current;
    zoneLocations.forEach(zp => {
      let total = 0, count = 0;
      zp.alias.forEach(z => {
        const d = zones.get(z);
        if (d?.density !== undefined) { total += d.density; count++; }
      });
      const density = count > 0 ? Math.round(total / count) : 0;

      let cCenter, cEdge;
      if (density < 40) {
        cCenter = 'rgba(16,185,129,0.55)';  cEdge = 'rgba(16,185,129,0)';
      } else if (density <= 70) {
        cCenter = 'rgba(245,158,11,0.6)';  cEdge = 'rgba(245,158,11,0)';
      } else {
        cCenter = 'rgba(239,68,68,0.65)';  cEdge = 'rgba(239,68,68,0)';
      }

      const pulse = density > 80 ? 1 + Math.sin(t / 280) * 0.1 : 1;
      const r = Math.max(zp.rx, zp.ry) * 1.8 * pulse;
      const grad = ctx.createRadialGradient(zp.x, zp.y, 8, zp.x, zp.y, r);
      grad.addColorStop(0, cCenter);
      grad.addColorStop(1, cEdge);
      ctx.beginPath();
      ctx.arc(zp.x, zp.y, r, 0, 2 * Math.PI);
      ctx.fillStyle = grad;
      ctx.fill();

      // Zone label + %
      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zp.id, zp.x, zp.y - 9);
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = density > 80 ? '#DC2626' : density > 70 ? '#D97706' : '#374151';
      ctx.fillText(`${density}%`, zp.x, zp.y + 9);
    });

    // Stand markers
    standPositions.forEach(sp => {
      const sd = stands.get(sp.id);
      const wait = sd?.waitTime ?? 0;
      const isHot = wait > 8;

      ctx.fillStyle = isHot ? '#F59E0B' : '#3B82F6';
      ctx.beginPath();
      ctx.roundRect(sp.x - 12, sp.y - 10, 24, 20, 4);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(sp.id, sp.x, sp.y);

      ctx.fillStyle = '#374151';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText(`${wait}m`, sp.x + 15, sp.y);
      ctx.textAlign = 'center';
    });

    // Gate labels
    [
      { label: 'Gate N', x: cx, y: cy - 255 },
      { label: 'Gate E', x: cx + 350, y: cy },
      { label: 'Gate S', x: cx, y: cy + 258 },
      { label: 'Gate W', x: cx - 355, y: cy },
    ].forEach(g => {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(g.label, g.x, g.y);
    });

    // ── Route overlay ──────────────────────────────────────────────
    if (activeRoute?.path) {
      const pts = [];
      for (const nid of activeRoute.path) {
        const p = getNodeMapPos(nid);
        if (p) {
          const last = pts[pts.length - 1];
          if (!last || Math.abs(last.x - p.x) > 5 || Math.abs(last.y - p.y) > 5) pts.push(p);
        }
      }
      if (pts.length >= 2) {
        ctx.save();
        ctx.setLineDash([8, 6]);
        ctx.lineDashOffset = -(t / 40);
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 3.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.9;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
        ctx.setLineDash([]);
        // Destination marker
        const d = pts[pts.length - 1];
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.arc(d.x, d.y, 8, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeRoute.destination || '', d.x, d.y);
        ctx.restore();
      }
    }

    ctx.restore();
  }, [zones, stands, activeRoute]);

  useEffect(() => {
    const animate = () => {
      timeRef.current = Date.now();
      draw();
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw]);

  useEffect(() => {
    const obs = new ResizeObserver(() => draw());
    if (containerRef.current) obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, [draw]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          position: 'absolute',
          left: 0,
          top: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
      {activeRoute && (
        <div style={{
          position: 'absolute', bottom: 10, left: '50%', transform: 'translateX(-50%)',
          background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12,
          padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 12, fontWeight: 600, color: '#065F46', whiteSpace: 'nowrap',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}>
          <span style={{ color: '#10B981', fontSize: 15 }}>✓</span>
          Smart route: {activeRoute.nashRerouteCount} others rerouted to keep your path clear
        </div>
      )}
    </div>
  );
};

// ─── Alert Feed ────────────────────────────────────────────────────────────────
const AlertFeed = ({ alerts }) => {
  const scrollRef = useRef(null);
  useEffect(() => {
    // Auto-scroll to newest (top)
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [alerts]);

  const dotColor = { red: '#EF4444', amber: '#F59E0B', green: '#22C55E', blue: '#3B82F6' };

  return (
    <div ref={scrollRef} style={{
      flex: 1,
      overflowY: 'auto',
      maxHeight: 200,
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
      scrollBehavior: 'smooth',
    }}>
      {alerts.length === 0 && (
        <div style={{ color: '#94A3B8', fontSize: 13, padding: '8px 0' }}>No alerts yet.</div>
      )}
      {alerts.map((a, i) => (
        <div key={`${a.timestamp}-${i}`} style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          padding: '8px 12px',
          borderRadius: 10,
          background: a.severity === 'red' ? 'rgba(239,68,68,0.07)'
            : a.severity === 'amber' ? 'rgba(245,158,11,0.07)'
            : a.severity === 'green' ? 'rgba(34,197,94,0.07)'
            : 'rgba(59,130,246,0.07)',
          borderLeft: `3px solid ${dotColor[a.severity] || '#CBD5E1'}`,
          animation: i === 0 ? 'alertSlideIn 0.3s ease-out' : 'none',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: dotColor[a.severity] || '#CBD5E1',
            marginTop: 4, flexShrink: 0,
          }} />
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

function formatTimeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

// ─── Metric Card (with CSS transitions on values) ─────────────────────────────
const MetricCard = ({ label, value, sub, subColor = '#22C55E' }) => (
  <div style={{
    background: '#fff',
    borderRadius: 14,
    padding: '16px 18px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    minWidth: 0,
  }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {label}
    </div>
    <div style={{
      fontSize: 28,
      fontWeight: 800,
      color: '#0F172A',
      lineHeight: 1.15,
      transition: 'all 0.6s cubic-bezier(.4,0,.2,1)',
    }}>{value}</div>
    <div style={{
      fontSize: 12,
      fontWeight: 600,
      color: subColor,
      transition: 'color 0.4s ease',
    }}>{sub}</div>
  </div>
);

// ─── Speed Button ──────────────────────────────────────────────────────────────
const SpeedBtn = ({ label, active, onClick }) => (
  <button id={`speed-${label}`} onClick={onClick} style={{
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
  }}>{label}</button>
);

// ─── Event Trigger Button (with flash feedback) ────────────────────────────────
const EventBtn = ({ id, label, color, onClick, flash }) => (
  <button id={id} onClick={onClick} style={{
    width: '100%',
    padding: '11px 0',
    borderRadius: 12,
    border: `1.5px solid ${color}22`,
    background: flash ? `${color}40` : `${color}0d`,
    color: color,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    letterSpacing: '0.01em',
    transition: 'background 0.2s, transform 0.1s, box-shadow 0.2s',
    boxShadow: flash ? `0 0 12px ${color}30` : 'none',
  }}
    onMouseEnter={e => e.currentTarget.style.background = `${color}20`}
    onMouseLeave={e => e.currentTarget.style.background = flash ? `${color}40` : `${color}0d`}
    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
  >{label}</button>
);

// ─── Fan App Preview (miniature phone frame) ──────────────────────────────────
const FanAppPreview = ({ comfortScore, nearestWait, crowdLevel, activeRouteCount, aiActionTitle }) => {
  const comfortColor = getComfortColor(comfortScore);

  // Mini comfort gauge SVG
  const size = 50;
  const ctr = size / 2;
  const r = 18;
  const sw = 4;
  const circ = 2 * Math.PI * r;
  const arc = circ * 0.75;
  const off = arc * (1 - comfortScore / 100);

  return (
    <div style={{
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
    }}>
      {/* Status bar */}
      <div style={{
        height: 16,
        background: '#0F172A',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
      }}>
        <div style={{ width: 24, height: 3, borderRadius: 2, background: '#475569' }} />
      </div>

      {/* Content */}
      <div style={{
        flex: 1,
        padding: '6px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        overflow: 'hidden',
      }}>
        {/* Mini header */}
        <div style={{
          fontSize: 7,
          fontWeight: 800,
          color: '#0F172A',
          letterSpacing: '-0.02em',
          width: '100%',
          textAlign: 'left',
        }}>
          FlowState
        </div>

        {/* Mini comfort gauge */}
        <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <circle
              cx={ctr} cy={ctr} r={r}
              fill="none" stroke="#E5E7EB"
              strokeWidth={sw}
              strokeDasharray={`${arc} ${circ}`}
              strokeLinecap="round"
              transform={`rotate(135 ${ctr} ${ctr})`}
            />
            <circle
              cx={ctr} cy={ctr} r={r}
              fill="none" stroke={comfortColor}
              strokeWidth={sw}
              strokeDasharray={`${arc} ${circ}`}
              strokeDashoffset={off}
              strokeLinecap="round"
              transform={`rotate(135 ${ctr} ${ctr})`}
              style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s' }}
            />
          </svg>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            fontSize: 12,
            fontWeight: 800,
            color: comfortColor,
            lineHeight: 1,
          }}>
            {comfortScore}
          </div>
        </div>
        <div style={{ fontSize: 6, color: '#64748B', fontWeight: 600, marginTop: -2 }}>
          Comfort Score
        </div>

        {/* Mini AI action card */}
        <div style={{
          width: '100%',
          background: 'rgba(16,185,129,0.08)',
          border: '1px solid rgba(16,185,129,0.2)',
          borderRadius: 6,
          padding: '4px 6px',
        }}>
          <div style={{ fontSize: 6, fontWeight: 700, color: '#065F46', lineHeight: 1.3 }}>
            {aiActionTitle || "You're in a great spot"}
          </div>
          <div style={{ fontSize: 5, color: '#059669', marginTop: 1 }}>
            Tap to navigate →
          </div>
        </div>

        {/* Mini stats row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr 1fr',
          gap: 3,
          width: '100%',
        }}>
          {[
            { val: `${nearestWait}m`, label: 'Food', color: '#22C55E' },
            { val: `${crowdLevel}%`, label: 'Crowd', color: '#3B82F6' },
            { val: activeRouteCount, label: 'Routes', color: '#F59E0B' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff',
              borderRadius: 4,
              padding: '3px 2px',
              textAlign: 'center',
              border: '0.5px solid #E2E8F0',
            }}>
              <div style={{
                fontSize: 8,
                fontWeight: 800,
                color: s.color,
                lineHeight: 1.2,
                transition: 'all 0.5s ease',
              }}>{s.val}</div>
              <div style={{ fontSize: 5, color: '#94A3B8', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom nav dots */}
      <div style={{
        height: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        background: '#fff',
        borderTop: '0.5px solid #E2E8F0',
      }}>
        {['○','□','△'].map((s,i) => (
          <span key={i} style={{ fontSize: 5, color: '#94A3B8' }}>{s}</span>
        ))}
      </div>
    </div>
  );
};

// ─── FlowState Logo ──────────────────────────────────────────────────────────
const FlowStateLogo = () => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
    <span style={{
      fontSize: 18,
      fontWeight: 800,
      letterSpacing: '-0.02em',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      gap: 6,
    }}>
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
      </svg>
      FlowState
    </span>
    <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>
      operator dashboard
    </span>
  </div>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export const OperatorPage = () => {
  const zones = useStore(state => state.zones);
  const stands = useStore(state => state.stands);
  const simState = useStore(state => state.simState);
  const storeAlerts = useStore(state => state.alerts);
  const setActiveRoute = useStore(state => state.setActiveRoute);
  const activeRoute = useStore(state => state.activeRoute);

  const [simTimeSecs, setSimTimeSecs] = useState(0);
  const [stats, setStats] = useState({ activeCount: 0, queuingCount: 0, total: 40000, phase: 'live_play' });
  const [speed, setSpeed] = useState(5);
  const [generatedAlerts, setGeneratedAlerts] = useState([]);
  const [demoRouteLoading, setDemoRouteLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', visible: false });
  const [flashBtn, setFlashBtn] = useState(null);
  const prevAvgWaitRef = useRef(null);
  const nashAlertCooldownRef = useRef(0);
  const comfortAlertCooldownRef = useRef({});

  const updateSimSpeed = useCallback((spd) => {
    setSpeed(spd);
    useStore.getState().setSimState({ speed: spd });
    if (db) set(ref(db, 'simulation/speed'), spd).catch(() => {});
  }, []);

  const generateAlerts = useCallback(() => {
    const newAlerts = [];
    const now = Date.now();

    // ── Nash routing intelligence alert ──
    const nashStats = getNashStats();
    if (nashStats.totalRoutes > 0 && now - nashAlertCooldownRef.current > 15000) {
      const standCount = stands.size || 4;
      const avgWait = computeAvgWait(stands);
      const reduction = Math.max(5, Math.round(100 - (avgWait / BASELINE_WAIT) * 100));
      newAlerts.push({
        message: `Nash routing distributed ${nashStats.nashRerouteCount.toLocaleString()} fans across ${standCount} stands. Avg wait reduced by ${reduction}%.`,
        severity: 'green',
        timestamp: now,
      });
      nashAlertCooldownRef.current = now;
    }

    // ── Comfort score drops below 40 in any zone group ──
    Object.entries(ZONE_GROUPS).forEach(([groupId, aliases]) => {
      let total = 0, count = 0;
      aliases.forEach(z => {
        const d = zones.get(z);
        if (d?.density !== undefined) { total += d.density; count++; }
      });
      const density = count > 0 ? Math.round(total / count) : 0;
      const comfort = densityToComfort(density);

      const lastAlert = comfortAlertCooldownRef.current[groupId] || 0;
      if (comfort < 40 && now - lastAlert > 20000) {
        newAlerts.push({
          message: `Zone ${groupId} comfort dropped to ${comfort}. Suggesting relocation to fans.`,
          severity: 'amber',
          timestamp: now,
        });
        comfortAlertCooldownRef.current[groupId] = now;
      }
    });

    // ── Zone density alerts (>85% → red) ──
    zones.forEach((zone, zoneId) => {
      if (zone.density > 85) {
        newAlerts.push({
          message: `Zone ${zoneId} at ${zone.density}%. High density detected.`,
          severity: 'red',
          timestamp: now,
        });
      }
    });

    // ── Stand wait alerts (>8min → amber) ──
    stands.forEach((stand, standId) => {
      if (stand.waitTime > 8) {
        newAlerts.push({
          message: `Stand ${standId} queue rising to ${stand.waitTime}min.`,
          severity: 'amber',
          timestamp: now,
        });
      }
    });

    // ── Session improvement green alert ──
    const avgWait = computeAvgWait(stands);
    if (prevAvgWaitRef.current !== null && avgWait < prevAvgWaitRef.current) {
      const pct = Math.round(((prevAvgWaitRef.current - avgWait) / prevAvgWaitRef.current) * 100);
      if (pct > 3) {
        newAlerts.push({
          message: `Avg wait reduced by ${pct}% this session.`,
          severity: 'green',
          timestamp: now,
        });
      }
    }
    prevAvgWaitRef.current = avgWait;

    if (newAlerts.length > 0) {
      setGeneratedAlerts(prev => {
        const combined = [...newAlerts, ...prev].slice(0, MAX_ALERTS);
        return combined;
      });
    }
  }, [zones, stands]);

  const showToast = useCallback((msg) => {
    setToast({ message: msg, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 2200);
  }, []);

  // Auto-start at 5x on mount
  useEffect(() => {
    startSimulation();
    queueMicrotask(() => updateSimSpeed(5));
  }, [updateSimSpeed]);

  // Live polling
  useEffect(() => {
    const interval = setInterval(() => {
      const s = getSimStats();
      setStats(s);
      setSimTimeSecs((prev) => prev + 0.1 * speed);
      generateAlerts();
    }, 100);
    return () => clearInterval(interval);
  }, [speed, generateAlerts]);

  const handleTriggerEvent = (event) => {
    triggerEvent(event);
    const labels = {
      halftime: 'Halftime break triggered',
      goal: 'Goal scored!',
      rain_delay: 'Rain delay activated',
      post_match: 'Final whistle — egress routing',
    };
    const alertLabels = {
      halftime: 'Halftime break triggered. Fan movement surging.',
      goal: 'Goal scored! Celebration movement spike.',
      rain_delay: 'Rain delay — fans seeking cover at stands.',
      post_match: 'Final whistle — egress routing activated.',
    };

    // Flash the button
    setFlashBtn(event);
    setTimeout(() => setFlashBtn(null), 500);

    // Show toast
    showToast(labels[event] || `Event: ${event}`);

    setGeneratedAlerts(prev => [{
      message: alertLabels[event] || `Event: ${event}`,
      severity: event === 'goal' ? 'green' : event === 'post_match' ? 'blue' : 'amber',
      timestamp: Date.now(),
    }, ...prev].slice(0, MAX_ALERTS));
  };

  const handleDemoRoute = async () => {
    setDemoRouteLoading(true);
    try {
      const result = await requestRoute('fan-1', 'food');
      if (result) {
        setActiveRoute(result);
        showToast(`Route to ${result.destination} calculated`);
        setGeneratedAlerts(prev => [{
          message: `Demo route: Fan → ${result.destination} (${result.waitTime}m wait). ${result.nashRerouteCount} others rerouted.`,
          severity: 'blue',
          timestamp: Date.now(),
        }, ...prev].slice(0, MAX_ALERTS));
      }
    } finally {
      setDemoRouteLoading(false);
    }
  };

  // --- Derived Stats ---
  const fanCount = stats.total;
  const capacity = 40000;
  const capPct = Math.round((fanCount / capacity) * 100);

  const avgWait = computeAvgWait(stands);
  const waitDelta = avgWait - BASELINE_WAIT;
  const waitDeltaLabel = waitDelta >= 0
    ? `+${waitDelta.toFixed(1)}m vs baseline`
    : `${waitDelta.toFixed(1)}m vs baseline`;

  const walkingCount = stats.activeCount; // fans walking or moving
  const activeRoutes = Math.floor(walkingCount * 0.7);

  const avgDensity = computeAvgDensity(zones);
  const comfortScore = densityToComfort(avgDensity);
  const comfortDelta = comfortScore - BASELINE_COMFORT;
  const comfortDeltaLabel = comfortDelta >= 0
    ? `+${comfortDelta} vs baseline`
    : `${comfortDelta} vs baseline`;

  const matchPhase = stats.phase || simState.state || 'live_play';
  const matchLabel = MATCH_STATES[matchPhase] || 'Live';
  const matchColor = MATCH_STATE_COLORS[matchPhase] || '#22c55e';

  const allAlerts = [...generatedAlerts, ...storeAlerts.map(a => ({
    ...a, severity: a.severity === 'high' ? 'red' : a.severity === 'low' ? 'green' : 'amber'
  }))].slice(0, MAX_ALERTS);

  // ── Fan app preview data ──
  const nearestWait = useMemo(() => {
    let best = 99;
    stands.forEach(s => {
      if (s.waitTime !== undefined && s.waitTime < best) best = s.waitTime;
    });
    return best >= 99 ? 0 : best;
  }, [stands]);

  const crowdLevel = useMemo(() => {
    // Use B4-B6 as the "fan's zone"
    const group = ['B4','B5','B6'];
    let total = 0, cnt = 0;
    group.forEach(z => {
      const d = zones.get(z);
      if (d?.density !== undefined) { total += d.density; cnt++; }
    });
    return cnt > 0 ? Math.round(total / cnt) : 0;
  }, [zones]);

  const fanActiveRoutes = useMemo(() => {
    const ns = getNashStats();
    return ns.totalRoutes || 0;
  }, [zones]);

  const aiActionTitle = useMemo(() => {
    if (nearestWait < 3) return 'Grab food now — ideal window';
    if (comfortScore < 50) return 'Your zone is getting crowded';
    return "You're in a great spot";
  }, [nearestWait, comfortScore]);

  return (
    <div style={{
      height: '100vh',
      maxHeight: '100vh',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      background: '#F1F5F9',
      fontFamily: "'Inter', system-ui, sans-serif",
    }}>
      {/* ── Header ── */}
      <header style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 28px',
        height: 56,
        background: '#0F172A',
        color: '#fff',
        flexShrink: 0,
        boxShadow: '0 2px 12px rgba(0,0,0,0.18)',
        zIndex: 10,
      }}>
        <FlowStateLogo />
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          {/* Live dot */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%', background: '#EF4444',
              boxShadow: '0 0 0 3px rgba(239,68,68,0.25)',
              animation: 'livePulse 1.4s ease-in-out infinite',
            }} />
            <span style={{ fontSize: 12, color: '#CBD5E1', fontWeight: 600 }}>LIVE</span>
          </div>

          {/* Sim clock */}
          <div style={{
            background: '#1E293B',
            borderRadius: 8,
            padding: '4px 12px',
            fontFamily: 'monospace',
            fontSize: 15,
            fontWeight: 700,
            color: '#38BDF8',
            letterSpacing: '0.06em',
          }}>
            {formatSimTime(simTimeSecs)}
          </div>

          {/* Match state badge */}
          <div style={{
            background: `${matchColor}22`,
            border: `1.5px solid ${matchColor}`,
            color: matchColor,
            borderRadius: 20,
            padding: '3px 12px',
            fontSize: 12,
            fontWeight: 700,
          }}>
            {matchLabel}
          </div>
        </div>
      </header>

      {/* ── Main Grid ── */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 240px',
        gap: 0,
        minHeight: 0,
      }}>

        {/* ─── LEFT PANEL ─── */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          padding: '20px 16px 20px 20px',
          minWidth: 0,
          minHeight: 0,
          overflowX: 'hidden',
          overflowY: 'auto',
        }}>
          {/* Stats Row */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 12,
          }}>
            <MetricCard
              label="Attendance"
              value={fanCount.toLocaleString()}
              sub={`${capPct}% capacity`}
              subColor="#3B82F6"
            />
            <MetricCard
              label="Avg Wait"
              value={`${avgWait.toFixed(1)}m`}
              sub={waitDeltaLabel}
              subColor={waitDelta < 0 ? '#22C55E' : '#EF4444'}
            />
            <MetricCard
              label="Active Routes"
              value={activeRoutes.toLocaleString()}
              sub="Live routing"
              subColor="#8B5CF6"
            />
            <MetricCard
              label="Comfort Avg"
              value={comfortScore}
              sub={comfortDeltaLabel}
              subColor={comfortDelta >= 0 ? '#22C55E' : '#EF4444'}
            />
          </div>

          {/* Map: column flex + bounded paint area so canvas height:100% resolves and cannot stretch the page */}
          <div style={{
            flex: 1,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
            overflow: 'hidden',
          }}>
            <div style={{
              padding: '12px 16px 8px',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Venue Heatmap
              </span>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { color: '#10B981', label: '<40%' },
                  { color: '#F59E0B', label: '40-70%' },
                  { color: '#EF4444', label: '>70%' },
                ].map(l => (
                  <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }} />
                    <span style={{ fontSize: 11, color: '#94A3B8' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
              <OperatorMapCanvas zones={zones} stands={stands} />
            </div>
          </div>

          {/* Alert Feed */}
          <div style={{
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
            padding: '14px 16px',
          }}>
            <div style={{
              fontSize: 11, fontWeight: 700, color: '#64748B',
              textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span>Live Alerts</span>
              <span style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#94A3B8',
                background: '#F1F5F9',
                padding: '2px 8px',
                borderRadius: 8,
              }}>
                {allAlerts.length} / {MAX_ALERTS}
              </span>
            </div>
            <AlertFeed alerts={allAlerts} />
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div style={{
          width: 240,
          background: '#fff',
          borderLeft: '1px solid #E2E8F0',
          padding: '20px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          overflowY: 'auto',
          flexShrink: 0,
        }}>

          {/* Sim Clock + Match State */}
          <div style={{ textAlign: 'center' }}>
            <div style={{
              fontFamily: 'monospace',
              fontSize: 30,
              fontWeight: 800,
              color: '#0F172A',
              letterSpacing: '0.04em',
              lineHeight: 1,
            }}>
              {formatSimTime(simTimeSecs)}
            </div>
            <div style={{ marginTop: 8 }}>
              <span style={{
                background: `${matchColor}18`,
                border: `1.5px solid ${matchColor}`,
                color: matchColor,
                borderRadius: 20,
                padding: '3px 14px',
                fontSize: 12,
                fontWeight: 700,
              }}>
                {matchLabel}
              </span>
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

          {/* ── Fan App Preview ── */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <span style={{ fontSize: 12 }}>📱</span> Fan App Preview
            </div>
            <FanAppPreview
              comfortScore={comfortScore}
              nearestWait={nearestWait}
              crowdLevel={crowdLevel}
              activeRouteCount={fanActiveRoutes}
              aiActionTitle={aiActionTitle}
            />
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

          {/* Speed */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
            }}>
              Simulation Speed
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              <SpeedBtn label="1x" active={speed === 1} onClick={() => updateSimSpeed(1)} />
              <SpeedBtn label="5x" active={speed === 5} onClick={() => updateSimSpeed(5)} />
              <SpeedBtn label="20x" active={speed === 20} onClick={() => updateSimSpeed(20)} />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

          {/* Event Triggers */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
            }}>
              Trigger Event
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <EventBtn
                id="trigger-halftime"
                label="Halftime break"
                color="#F59E0B"
                flash={flashBtn === 'halftime'}
                onClick={() => handleTriggerEvent('halftime')}
              />
              <EventBtn
                id="trigger-goal"
                label="Goal scored"
                color="#22C55E"
                flash={flashBtn === 'goal'}
                onClick={() => handleTriggerEvent('goal')}
              />
              <EventBtn
                id="trigger-rain"
                label="Rain delay"
                color="#3B82F6"
                flash={flashBtn === 'rain_delay'}
                onClick={() => handleTriggerEvent('rain_delay')}
              />
              <EventBtn
                id="trigger-whistle"
                label="Final whistle"
                color="#EF4444"
                flash={flashBtn === 'post_match'}
                onClick={() => handleTriggerEvent('post_match')}
              />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

          {/* Demo Route */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
            }}>
              Route Demo
            </div>
            <EventBtn
              id="demo-route"
              label={demoRouteLoading ? '⏳ Calculating…' : '🗺️ Demo route'}
              color="#8B5CF6"
              flash={false}
              onClick={handleDemoRoute}
            />
            {activeRoute && (
              <div style={{
                marginTop: 8, padding: '8px 10px', borderRadius: 8,
                background: '#F5F3FF', border: '1px solid #DDD6FE',
                fontSize: 11, color: '#6D28D9', lineHeight: 1.4,
              }}>
                Route to <b>{activeRoute.destination}</b> • {activeRoute.waitTime}m wait
                <br />
                <span style={{ color: '#059669' }}>{activeRoute.nashRerouteCount} fans rerouted</span>
              </div>
            )}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0', margin: 0 }} />

          {/* Zone summary */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
            }}>
              Zone Status
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {Object.entries(ZONE_GROUPS).map(([zGroup, aliases]) => {
                let total = 0, count = 0;
                aliases.forEach(z => {
                  const d = zones.get(z);
                  if (d?.density !== undefined) { total += d.density; count++; }
                });
                const density = count > 0 ? Math.round(total / count) : 0;
                const barColor = density > 80 ? '#EF4444' : density > 60 ? '#F59E0B' : '#22C55E';
                return (
                  <div key={zGroup} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: '#475569', width: 48, flexShrink: 0 }}>{zGroup}</span>
                    <div style={{ flex: 1, height: 6, background: '#E2E8F0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{
                        width: `${density}%`, height: '100%',
                        background: barColor,
                        borderRadius: 4,
                        transition: 'width 0.6s ease, background 0.4s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: '#64748B', width: 28, textAlign: 'right' }}>{density}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} />

      {/* Inline keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 3px rgba(239,68,68,0.3); }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(239,68,68,0.1); }
        }
        @keyframes alertSlideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function computeAvgWait(stands) {
  if (!stands || stands.size === 0) return 0;
  let total = 0, count = 0;
  stands.forEach(s => { if (s.waitTime !== undefined) { total += s.waitTime; count++; } });
  return count > 0 ? total / count : 0;
}

function computeAvgDensity(zones) {
  if (!zones || zones.size === 0) return 0;
  let total = 0, count = 0;
  zones.forEach(z => { if (z.density !== undefined) { total += z.density; count++; } });
  return count > 0 ? total / count : 0;
}
