import React, { useRef, useEffect, useCallback } from 'react';
import { useStore } from '../store/useStore';
import {
  MAX_CANVAS_CSS_PX,
  OP_MAP_W,
  OP_MAP_H,
  OP_CX,
  OP_CY,
  OPERATOR_ZONE_LOCATIONS,
  OPERATOR_STAND_POSITIONS,
  getOperatorNodeMapPos,
} from './operatorMapModel';

export const OperatorMapCanvas = ({ zones, stands }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const animRef = useRef();
  const timeRef = useRef(0);
  const activeRoute = useStore((state) => state.activeRoute);

  const logicalW = OP_MAP_W;
  const logicalH = OP_MAP_H;
  const cx = OP_CX;
  const cy = OP_CY;

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
    ctx.ellipse(cx, cy, 240, 175, 0, 0, 2 * Math.PI);
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

    ctx.restore();
  }, [zones, stands, activeRoute, cx, cy, logicalW, logicalH]);

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
        <div
          style={{
            position: 'absolute',
            bottom: 10,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 12,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 12,
            fontWeight: 600,
            color: '#065F46',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          <span style={{ color: '#10B981', fontSize: 15 }}>✓</span>
          Smart route: {activeRoute.nashRerouteCount} others rerouted to keep your path clear
        </div>
      )}
    </div>
  );
};
