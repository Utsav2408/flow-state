import React, { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import {
  MAX_CANVAS_CSS_PX,
  OP_MAP_W,
  OP_MAP_H,
  OP_CX,
  OP_CY,
  OP_INNER_GROUND_RX,
  OP_INNER_GROUND_RY,
  OPERATOR_ZONE_LOCATIONS,
  OPERATOR_STAND_POSITIONS,
  getOperatorNodeMapPos,
} from './operatorMapModel';

export const OperatorMapCanvas = ({ zones, stands, matchPhase }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef();
  const timeRef = useRef(0);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const dragRef = useRef({ isDragging: false, lastX: 0, lastY: 0 });
  const activeRoute = useStore((state) => state.activeRoute);

  const logicalW = OP_MAP_W;
  const logicalH = OP_MAP_H;
  const cx = OP_CX;
  const cy = OP_CY;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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

    const { x: panX, y: panY } = panRef.current;
    const zoomLevel = zoomRef.current;
    ctx.translate(panX, panY);
    ctx.scale(zoomLevel, zoomLevel);

    const scale = Math.min(cssW / logicalW, cssH / logicalH) * 0.95;
    const ox = (cssW - logicalW * scale) / 2;
    const oy = (cssH - logicalH * scale) / 2;

    ctx.save();
    ctx.translate(ox, oy);
    ctx.scale(scale, scale);

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

    ctx.beginPath();
    ctx.ellipse(cx, cy, 360, 270, 0, 0, 2 * Math.PI);
    ctx.fillStyle = 'rgba(248,247,244,0.85)';
    ctx.fill();
    ctx.strokeStyle = '#D1D5DB';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([8, 8]);
    ctx.ellipse(cx, cy, OP_INNER_GROUND_RX, OP_INNER_GROUND_RY, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = '#CBD5E1';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.setLineDash([]);

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

    const t = timeRef.current;

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, logicalW, logicalH);
    ctx.ellipse(cx, cy, OP_INNER_GROUND_RX, OP_INNER_GROUND_RY, 0, 0, 2 * Math.PI);
    ctx.clip('evenodd');

    OPERATOR_ZONE_LOCATIONS.forEach((zp) => {
      let total = 0;
      let count = 0;
      zp.alias.forEach((z) => {
        const d = zones.get(z);
        if (d?.density !== undefined) {
          total += d.density;
          count++;
        }
      });
      const density = count > 0 ? Math.round(total / count) : 0;

      let cCenter;
      let cEdge;
      if (density < 40) {
        cCenter = 'rgba(16,185,129,0.55)';
        cEdge = 'rgba(16,185,129,0)';
      } else if (density <= 70) {
        cCenter = 'rgba(245,158,11,0.6)';
        cEdge = 'rgba(245,158,11,0)';
      } else {
        cCenter = 'rgba(239,68,68,0.65)';
        cEdge = 'rgba(239,68,68,0)';
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

      ctx.fillStyle = '#1E293B';
      ctx.font = 'bold 13px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(zp.id, zp.x, zp.y - 9);
      ctx.font = '12px Inter, sans-serif';
      ctx.fillStyle = density > 80 ? '#DC2626' : density > 70 ? '#D97706' : '#374151';
      ctx.fillText(`${density}%`, zp.x, zp.y + 9);
    });

    ctx.restore();

    OPERATOR_STAND_POSITIONS.forEach((sp) => {
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

    [
      { label: 'Gate N', x: cx, y: cy - 255 },
      { label: 'Gate E', x: cx + 350, y: cy },
      { label: 'Gate S', x: cx, y: cy + 258 },
      { label: 'Gate W', x: cx - 355, y: cy },
    ].forEach((g) => {
      ctx.fillStyle = '#94A3B8';
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(g.label, g.x, g.y);
    });

    if (activeRoute?.path) {
      const pts = [];
      for (const nid of activeRoute.path) {
        const p = getOperatorNodeMapPos(nid);
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

    if (matchPhase === 'post_match') {
      const gateTargets = [
        { x: cx - 355, y: cy, color: '#3B82F6' },
        { x: cx + 350, y: cy, color: '#2563EB' },
        { x: cx, y: cy + 258, color: '#0EA5E9' },
        { x: cx, y: cy - 255, color: '#60A5FA' },
      ];

      OPERATOR_ZONE_LOCATIONS.forEach((zone, idx) => {
        const gate = gateTargets[idx % gateTargets.length];
        for (let i = 0; i < 10; i += 1) {
          const shift = i / 10;
          const phase = ((t / 1200) + shift) % 1;
          const x = zone.x + (gate.x - zone.x) * phase;
          const y = zone.y + (gate.y - zone.y) * phase;
          ctx.beginPath();
          ctx.arc(x, y, 2.6, 0, 2 * Math.PI);
          ctx.fillStyle = gate.color;
          ctx.globalAlpha = 0.28 + 0.65 * (1 - phase);
          ctx.fill();
        }
      });
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }, [zones, stands, activeRoute, cx, cy, logicalW, logicalH, matchPhase]);

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const onWheel = (e) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const oldScale = zoomRef.current;
      const nextScale = clamp(oldScale + e.deltaY * -0.001, 0.5, 3);
      if (nextScale === oldScale) return;

      const { x: panX, y: panY } = panRef.current;
      const scaleRatio = nextScale / oldScale;
      panRef.current = {
        x: mouseX - (mouseX - panX) * scaleRatio,
        y: mouseY - (mouseY - panY) * scaleRatio,
      };
      zoomRef.current = nextScale;
    };

    const onMouseDown = (e) => {
      if (e.button !== 0) return;
      dragRef.current = { isDragging: true, lastX: e.clientX, lastY: e.clientY };
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!dragRef.current.isDragging) return;
      const dx = e.clientX - dragRef.current.lastX;
      const dy = e.clientY - dragRef.current.lastY;
      panRef.current = {
        x: panRef.current.x + dx,
        y: panRef.current.y + dy,
      };
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    };

    const endDrag = () => {
      if (!dragRef.current.isDragging) return;
      dragRef.current.isDragging = false;
      if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
    };

    canvas.style.cursor = 'grab';
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', endDrag);

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', endDrag);
    };
  }, []);

  const resetView = () => {
    zoomRef.current = 1;
    panRef.current = { x: 0, y: 0 };
    dragRef.current = { isDragging: false, lastX: 0, lastY: 0 };
    if (canvasRef.current) canvasRef.current.style.cursor = 'grab';
  };

  const zoomByStep = (delta) => {
    zoomRef.current = clamp(zoomRef.current + delta, 0.5, 3);
    draw();
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div
        ref={containerRef}
        style={{
          flex: 1,
          minHeight: 0,
          position: 'relative',
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
            pointerEvents: 'auto',
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: 8,
            bottom: 8,
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            zIndex: 2,
          }}
        >
          {[
            { label: '+', onClick: () => zoomByStep(0.2), ariaLabel: 'Zoom in' },
            { label: '−', onClick: () => zoomByStep(-0.2), ariaLabel: 'Zoom out' },
          ].map((btn) => (
            <button
              key={btn.ariaLabel}
              type="button"
              aria-label={btn.ariaLabel}
              onClick={btn.onClick}
              style={{
                width: 32,
                height: 32,
                background: '#fff',
                border: '0.5px solid #ddd',
                borderRadius: 6,
                fontSize: 18,
                fontWeight: 500,
                color: '#333',
                cursor: 'pointer',
                lineHeight: 1,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = '#fff';
              }}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      <div
        style={{
          marginTop: 8,
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <button
          type="button"
          onClick={resetView}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#475569',
            background: '#F8FAFC',
            border: '1px solid #CBD5E1',
            borderRadius: 8,
            padding: '6px 10px',
            cursor: 'pointer',
          }}
        >
          Reset view
        </button>
      </div>

      {activeRoute && (
        <div
          style={{
            marginTop: 8,
            width: '100%',
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 12,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 600,
            color: '#065F46',
            textAlign: 'center',
            boxSizing: 'border-box',
          }}
        >
          <span style={{ color: '#10B981', fontSize: 15 }}>✓</span>
          Smart route: {activeRoute.nashRerouteCount} others rerouted to keep your path clear
        </div>
      )}
    </div>
  );
};
