import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useStore } from '../store/useStore';
import { db, ref, set } from '../firebase';
import { startSimulation, triggerEvent, getSimStats } from '../simulation/crowdSimulator';

// ─── Constants ────────────────────────────────────────────────────────────────
const BASELINE_WAIT = 5.5; // minutes
const BASELINE_COMFORT = 66; // 0–100 score

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

// density 0-100 → comfort 0-100 (inverted)
function densityToComfort(density) {
  return Math.max(0, Math.min(100, Math.round(100 - density)));
}

function formatSimTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ─── Operator Venue Map Canvas ─────────────────────────────────────────────
const OperatorMapCanvas = ({ zones, stands }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const offscreenRef = useRef(document.createElement('canvas'));
  const animRef = useRef();
  const timeRef = useRef(0);

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

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);

    const scale = Math.min(rect.width / logicalW, rect.height / logicalH) * 0.95;
    const ox = (rect.width - logicalW * scale) / 2;
    const oy = (rect.height - logicalH * scale) / 2;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

    // Stadium outer oval
    ctx.beginPath();
    ctx.ellipse(cx, cy, 360, 270, 0, 0, 2 * Math.PI);
    ctx.fillStyle = '#F8F7F4';
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

    // Heatmap blobs
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
        cCenter = 'rgba(34,197,94,0.45)';  cEdge = 'rgba(34,197,94,0)';
      } else if (density <= 70) {
        cCenter = 'rgba(245,158,11,0.5)';  cEdge = 'rgba(245,158,11,0)';
      } else {
        cCenter = 'rgba(239,68,68,0.55)';  cEdge = 'rgba(239,68,68,0)';
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
      ctx.fillStyle = density > 80 ? '#EF4444' : density > 70 ? '#D97706' : '#374151';
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

    ctx.restore();
  }, [zones, stands]);

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
    <div ref={containerRef} style={{ width: '100%', height: '100%', minHeight: 340 }}>
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};

// ─── Alert Feed ────────────────────────────────────────────────────────────────
const AlertFeed = ({ alerts }) => {
  const scrollRef = useRef(null);
  useEffect(() => {
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
    }}>
      {alerts.length === 0 && (
        <div style={{ color: '#94A3B8', fontSize: 13, padding: '8px 0' }}>No alerts yet.</div>
      )}
      {alerts.map((a, i) => (
        <div key={i} style={{
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

// ─── Metric Card ──────────────────────────────────────────────────────────────
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
    <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', lineHeight: 1.15 }}>{value}</div>
    <div style={{ fontSize: 12, fontWeight: 600, color: subColor }}>{sub}</div>
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

// ─── Event Trigger Button ──────────────────────────────────────────────────────
const EventBtn = ({ id, label, color, onClick }) => (
  <button id={id} onClick={onClick} style={{
    width: '100%',
    padding: '11px 0',
    borderRadius: 12,
    border: `1.5px solid ${color}22`,
    background: `${color}0d`,
    color: color,
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    letterSpacing: '0.01em',
    transition: 'background 0.15s, transform 0.1s',
  }}
    onMouseEnter={e => e.currentTarget.style.background = `${color}20`}
    onMouseLeave={e => e.currentTarget.style.background = `${color}0d`}
    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
  >{label}</button>
);

// ─── Main Component ──────────────────────────────────────────────────────────
export const OperatorPage = () => {
  const zones = useStore(state => state.zones);
  const stands = useStore(state => state.stands);
  const simState = useStore(state => state.simState);
  const storeAlerts = useStore(state => state.alerts);

  const [simTimeSecs, setSimTimeSecs] = useState(0);
  const [stats, setStats] = useState({ activeCount: 0, queuingCount: 0, total: 40000, phase: 'live_play' });
  const [speed, setSpeed] = useState(5);
  const [generatedAlerts, setGeneratedAlerts] = useState([]);
  const sessionStartRef = useRef(Date.now());
  const prevAvgWaitRef = useRef(null);

  // Auto-start at 5x on mount
  useEffect(() => {
    startSimulation();
    updateSimSpeed(5);
  }, []);

  // Live polling
  useEffect(() => {
    const interval = setInterval(() => {
      const s = getSimStats();
      setStats(s);
      setSimTimeSecs(prev => prev + (0.1 * speed));
      generateAlerts();
    }, 100);
    return () => clearInterval(interval);
  }, [speed, zones, stands]);

  const generateAlerts = useCallback(() => {
    const newAlerts = [];

    // Zone density alerts (>85% → red)
    zones.forEach((zone, zoneId) => {
      if (zone.density > 85) {
        newAlerts.push({
          message: `Zone ${zoneId} at ${zone.density}%. High density detected.`,
          severity: 'red',
          timestamp: Date.now(),
        });
      }
    });

    // Stand wait alerts (>8min → amber)
    stands.forEach((stand, standId) => {
      if (stand.waitTime > 8) {
        newAlerts.push({
          message: `Stand ${standId} queue rising to ${stand.waitTime}min.`,
          severity: 'amber',
          timestamp: Date.now(),
        });
      }
    });

    // Session improvement green alert
    const avgWait = computeAvgWait(stands);
    if (prevAvgWaitRef.current !== null && avgWait < prevAvgWaitRef.current) {
      const pct = Math.round(((prevAvgWaitRef.current - avgWait) / prevAvgWaitRef.current) * 100);
      if (pct > 3) {
        newAlerts.push({
          message: `Avg wait reduced by ${pct}% this session.`,
          severity: 'green',
          timestamp: Date.now(),
        });
      }
    }
    prevAvgWaitRef.current = avgWait;

    if (newAlerts.length > 0) {
      setGeneratedAlerts(prev => {
        const combined = [...newAlerts, ...prev].slice(0, 30);
        return combined;
      });
    }
  }, [zones, stands]);

  const updateSimSpeed = (spd) => {
    setSpeed(spd);
    useStore.getState().setSimState({ speed: spd });
    if (db) set(ref(db, 'simulation/speed'), spd).catch(() => {});
  };

  const handleTriggerEvent = (event) => {
    triggerEvent(event);
    const labels = {
      halftime: 'Halftime break triggered. Fan movement surging.',
      goal: 'Goal scored! Celebration movement spike.',
      rain_delay: 'Rain delay — fans seeking cover at stands.',
      post_match: 'Final whistle — egress routing activated.',
    };
    setGeneratedAlerts(prev => [{
      message: labels[event] || `Event: ${event}`,
      severity: event === 'goal' ? 'green' : event === 'post_match' ? 'blue' : 'amber',
      timestamp: Date.now(),
    }, ...prev].slice(0, 30));
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
  }))].slice(0, 30);

  return (
    <div style={{
      minHeight: '100vh',
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-0.02em' }}>
            FlowState
          </span>
          <span style={{ fontSize: 13, color: '#94A3B8', fontWeight: 500 }}>
            operator dashboard
          </span>
        </div>
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
        gridTemplateColumns: '1fr 220px',
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
          overflow: 'hidden',
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

          {/* Map */}
          <div style={{
            flex: 1,
            background: '#fff',
            borderRadius: 16,
            boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
            overflow: 'hidden',
            minHeight: 300,
          }}>
            <div style={{ padding: '12px 16px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                Venue Heatmap
              </span>
              <div style={{ display: 'flex', gap: 12 }}>
                {[
                  { color: '#22C55E', label: '<40%' },
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
            <OperatorMapCanvas zones={zones} stands={stands} />
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
            }}>
              Live Alerts
            </div>
            <AlertFeed alerts={allAlerts} />
          </div>
        </div>

        {/* ─── RIGHT PANEL ─── */}
        <div style={{
          width: 220,
          background: '#fff',
          borderLeft: '1px solid #E2E8F0',
          padding: '20px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
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

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0' }} />

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

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0' }} />

          {/* Event Triggers */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
            }}>
              Trigger Event
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <EventBtn id="trigger-halftime" label="Halftime break" color="#F59E0B" onClick={() => handleTriggerEvent('halftime')} />
              <EventBtn id="trigger-goal" label="Goal scored" color="#22C55E" onClick={() => handleTriggerEvent('goal')} />
              <EventBtn id="trigger-rain" label="Rain delay" color="#3B82F6" onClick={() => handleTriggerEvent('rain_delay')} />
              <EventBtn id="trigger-whistle" label="Final whistle" color="#EF4444" onClick={() => handleTriggerEvent('post_match')} />
            </div>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #E2E8F0' }} />

          {/* Zone summary */}
          <div>
            <div style={{
              fontSize: 10, fontWeight: 700, color: '#94A3B8',
              textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8,
            }}>
              Zone Status
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              {['A1-A4','B1-B3','B4-B6','C1-C3','C4-C6','D1-D3'].map(zGroup => {
                const aliases = {
                  'A1-A4': ['A1','A2','A3','A4'],
                  'B1-B3': ['B1','B2','B3'],
                  'B4-B6': ['B4','B5','B6'],
                  'C1-C3': ['C1','C2','C3'],
                  'C4-C6': ['C4','C5','C6'],
                  'D1-D3': ['D1','D2','D3'],
                }[zGroup];
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
                        transition: 'width 0.6s ease',
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

      {/* Inline keyframes */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        @keyframes livePulse {
          0%, 100% { opacity: 1; box-shadow: 0 0 0 3px rgba(239,68,68,0.3); }
          50% { opacity: 0.7; box-shadow: 0 0 0 6px rgba(239,68,68,0.1); }
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
