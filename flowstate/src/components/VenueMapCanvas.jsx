import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import { DENSITY_UI } from '../config/comfortConfig';
import {
  LOGICAL_MAP,
  ZONE_GROUPS,
  STAND_LAYOUT,
  GATES_LAYOUT,
  getNodeCanvasPos,
} from '../models/venueLayout';

export const VenueMapCanvas = ({ filters, disableInteraction = false, showMeetupCentroid = false }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(document.createElement('canvas'));
  const zones = useStore(state => state.zones);
  const stands = useStore(state => state.stands);
  const activeRoute = useStore(state => state.activeRoute);
  const groupMembers = useStore(state => state.groupMembers);
  
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredMember, setHoveredMember] = useState(null);
  const requestRef = useRef();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Animation pulse clock
  const [time, setTime] = useState(0);

  const logicalWidth = LOGICAL_MAP.width;
  const logicalHeight = LOGICAL_MAP.height;
  const cx = LOGICAL_MAP.cx;
  const cy = LOGICAL_MAP.cy;

  const zoneLocations = ZONE_GROUPS;

  const meetupCentroid = useMemo(() => {
    if (!showMeetupCentroid || !groupMembers.length) return null;
    const sx = groupMembers.reduce((a, m) => a + m.x, 0) / groupMembers.length;
    const sy = groupMembers.reduce((a, m) => a + m.y, 0) / groupMembers.length;
    return { x: sx, y: sy };
  }, [groupMembers, showMeetupCentroid]);

  // Handle Request Animation Frame for pulse
  useEffect(() => {
    const animate = () => {
      setTime(Date.now());
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

  // ResizeObserver — re-trigger the main render whenever the container resizes
  // (fixes blank/static canvas in small containers like the Group page card)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ width, height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Update offscreen canvas (Heatmap layer) when data changes
  useEffect(() => {
    const osCanvas = offscreenCanvasRef.current;
    osCanvas.width = logicalWidth;
    osCanvas.height = logicalHeight;
    const ctx = osCanvas.getContext('2d', { alpha: true });
    ctx.clearRect(0, 0, logicalWidth, logicalHeight);

    if (filters.density !== false) {
      zoneLocations.forEach(zp => {
        let totalVal = 0, count = 0;
        zp.alias.forEach(z => {
          const zd = zones.get(z);
          if (zd && zd.density !== undefined) {
             totalVal += zd.density;
             count++;
          }
        });
        const density = count > 0 ? Math.round(totalVal / count) : 0;
        
        let colorCenter, colorEdge;
        let isPulsing = false;
        if (density < DENSITY_UI.lowMax) {
            colorCenter = 'rgba(159, 225, 203, 0.8)';
            colorEdge = 'rgba(159, 225, 203, 0)';
        } else if (density <= DENSITY_UI.midMax) {
            colorCenter = 'rgba(250, 199, 117, 0.8)';
            colorEdge = 'rgba(250, 199, 117, 0)';
        } else {
            colorCenter = 'rgba(240, 149, 149, 0.9)';
            colorEdge = 'rgba(240, 149, 149, 0)';
            if (density > DENSITY_UI.pulseAbove) isPulsing = true;
        }

        // Pulse logic - simple scale oscilation
        let pulseRadius = 1;
        if (isPulsing) {
            pulseRadius = 1 + Math.sin(time / 200) * 0.15; // smooth 500ms feel oscilator
        }
        
        ctx.globalCompositeOperation = 'screen';
        const grad = ctx.createRadialGradient(zp.x, zp.y, 10, zp.x, zp.y, Math.max(zp.rx, zp.ry) * 2 * pulseRadius);
        grad.addColorStop(0, colorCenter);
        grad.addColorStop(1, colorEdge);

        ctx.beginPath();
        ctx.arc(zp.x, zp.y, Math.max(zp.rx, zp.ry) * 2 * pulseRadius, 0, 2 * Math.PI);
        ctx.fillStyle = grad;
        ctx.fill();
      });
    }
  }, [filters.density, zones, logicalWidth, logicalHeight, time]); // add time so it animates


  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = containerRef.current.getBoundingClientRect();

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, rect.width, rect.height);
    
    ctx.save();
    
    // Default centering to fit container
    const scaleFit = Math.min(rect.width / logicalWidth, rect.height / logicalHeight) * transform.scale;
    const offsetX = (rect.width - logicalWidth * scaleFit) / 2 + transform.x;
    const offsetY = (rect.height - logicalHeight * scaleFit) / 2 + transform.y;
    
    ctx.translate(offsetX, offsetY);
    ctx.scale(scaleFit, scaleFit);

    // Render Stadium Base
    ctx.beginPath();
    ctx.ellipse(cx, cy, 350, 350, 0, 0, 2 * Math.PI);
    ctx.fillStyle = '#F5F5F0';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#E0E0E0';
    ctx.stroke();

    ctx.beginPath();
    ctx.setLineDash([10, 10]);
    ctx.ellipse(cx, cy, 220, 220, 0, 0, 2 * Math.PI);
    ctx.strokeStyle = '#BDBDBD';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]); 

    ctx.beginPath();
    ctx.roundRect(cx - 80, cy - 80, 160, 160, 10);
    ctx.fillStyle = '#F5F5F0';
    ctx.fill();
    ctx.strokeStyle = '#D6D6D6';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#737373';
    ctx.font = '16px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Pitch', cx, cy);

    // Render offscreen heatmap using screen overlay
    ctx.globalCompositeOperation = 'screen';
    ctx.drawImage(offscreenCanvasRef.current, 0, 0);
    ctx.globalCompositeOperation = 'source-over'; // reset

    const showDensity = filters.density !== false;
    const showFood = filters.food !== false;
    const showExits = filters.exits !== false;

    // Draw Labels & Hard contours
    if (showDensity) {
      zoneLocations.forEach(zp => {
        let totalVal = 0, count = 0;
        zp.alias.forEach(z => {
          const zd = zones.get(z);
          if (zd && zd.density !== undefined) {
             totalVal += zd.density;
             count++;
          }
        });
        const density = count > 0 ? Math.round(totalVal / count) : 0;
        
        ctx.fillStyle = '#404040';
        ctx.font = 'bold 16px Inter, sans-serif';
        ctx.fillText(zp.id, zp.x, zp.y - 10);
        ctx.font = '14px Inter, sans-serif';
        ctx.fillText(`${density}%`, zp.x, zp.y + 10);
      });
    }

    if (showFood) {
      STAND_LAYOUT.forEach(sp => {
        const standData = stands.get(sp.id);
        const waitTime = standData ? standData.waitTime : '?';

        ctx.fillStyle = '#3B82F6';
        ctx.beginPath();
        ctx.roundRect(sp.x - 10, sp.y - 10, 20, 20, 4);
        ctx.fill();

        ctx.fillStyle = '#404040';
        ctx.font = '12px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`${sp.id} - ${waitTime}m`, sp.x + 15, sp.y);
        ctx.textAlign = 'center';
      });
    }

    if (showExits) {
      ctx.fillStyle = '#9CA3AF';
      ctx.font = '14px Inter, sans-serif';
      GATES_LAYOUT.forEach((g) => {
        ctx.fillText(`${g.id} (${g.shortLabel})`, g.x, g.y);
      });
    }

    const youM = groupMembers.find((m) => m.id === 'You');
    const youX = youM?.x ?? cx + 150;
    const youY = youM?.y ?? cy - 100;

    // "You" marker (always; group members list also includes You for centroid math)
    ctx.beginPath();
    ctx.arc(youX, youY, 8, 0, 2 * Math.PI);
    ctx.fillStyle = '#2563EB';
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#2563EB';
    ctx.font = 'bold 10px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('You', youX, youY);

    // Render other group members (You drawn above)
    if (filters.group !== false) {
      groupMembers.filter((m) => m.id !== 'You').forEach(m => {
        ctx.beginPath();
        ctx.arc(m.x, m.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = m.color;
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 8px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(m.id, m.x, m.y);
      });
    }

    // Meetup suggestion (computed centroid — not interactive; drawn on canvas)
    if (meetupCentroid) {
      ctx.save();
      ctx.setLineDash([8, 6]);
      ctx.strokeStyle = '#93C5FD';
      ctx.lineWidth = 2;
      ctx.fillStyle = 'rgba(219, 234, 254, 0.45)';
      const mw = 40;
      const mh = 24;
      ctx.beginPath();
      ctx.roundRect(meetupCentroid.x - mw, meetupCentroid.y - mh, mw * 2, mh * 2, 10);
      ctx.fill();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = '#2563EB';
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Meetup', meetupCentroid.x, meetupCentroid.y);
      ctx.restore();
    }

    // ── Route overlay (animated dashed blue path) ────────────────────
    if (activeRoute?.path) {
      // Build deduplicated position array starting from "You"
      const pts = [{ x: youX, y: youY }];
      for (const nid of activeRoute.path) {
        const p = getNodeCanvasPos(nid);
        if (p) {
          const last = pts[pts.length - 1];
          if (!last || Math.abs(last.x - p.x) > 5 || Math.abs(last.y - p.y) > 5) {
            pts.push(p);
          }
        }
      }

      if (pts.length >= 2) {
        // Animated dashed line
        ctx.save();
        ctx.setLineDash([10, 8]);
        ctx.lineDashOffset = -(time / 50);
        ctx.strokeStyle = '#2563EB';
        ctx.lineWidth = 3.5;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.globalAlpha = 0.85;

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Destination marker (red square)
        const dest = pts[pts.length - 1];
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#EF4444';
        ctx.beginPath();
        ctx.roundRect(dest.x - 10, dest.y - 10, 20, 20, 4);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeRoute.destination || '', dest.x, dest.y);

        ctx.restore();
      }
    }

    // Interactive Tooltip (Hover)
    if (hoveredMember) {
      ctx.save();
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0,0,0,0.15)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 2;
      
      const textWidth = Math.max(ctx.measureText(hoveredMember.name).width, ctx.measureText(hoveredMember.zone).width);
      const ttWidth = Math.max(120, textWidth + 30);
      const ttHeight = 44;
      const ttX = hoveredMember.x - ttWidth / 2;
      const ttY = hoveredMember.y - 65;
      
      ctx.beginPath();
      ctx.roundRect(ttX, ttY, ttWidth, ttHeight, 8);
      ctx.fill();
      
      // Pointer
      ctx.beginPath();
      ctx.moveTo(hoveredMember.x - 6, ttY + ttHeight);
      ctx.lineTo(hoveredMember.x + 6, ttY + ttHeight);
      ctx.lineTo(hoveredMember.x, ttY + ttHeight + 6);
      ctx.closePath();
      ctx.fill();
      
      ctx.shadowColor = 'transparent';
      ctx.beginPath();
      ctx.roundRect(ttX, ttY, ttWidth, ttHeight, 8);
      ctx.strokeStyle = '#E5E7EB';
      ctx.stroke();
      
      ctx.fillStyle = '#111827';
      ctx.font = 'bold 12px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(hoveredMember.name, hoveredMember.x, ttY + 8);
      
      ctx.fillStyle = '#6B7280';
      ctx.font = '10px Inter, sans-serif';
      ctx.fillText(hoveredMember.zone, hoveredMember.x, ttY + 24);
      
      ctx.restore();
    }

    ctx.restore();

  }, [filters, transform, zones, stands, activeRoute, logicalWidth, logicalHeight, zoneLocations, groupMembers, time, hoveredMember, cx, cy, meetupCentroid, containerSize]);

  // React's delegated onWheel is often passive; preventDefault won't run and the page may steal the gesture.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e) => {
      if (disableInteraction) return;
      e.preventDefault();
      e.stopPropagation();
      const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
      setTransform((prev) => ({
        ...prev,
        scale: Math.max(0.5, Math.min(3, prev.scale * scaleFactor)),
      }));
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [disableInteraction]);

  const handleMouseDown = (e) => {
    if (disableInteraction) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  const handleMouseMove = (e) => {
    if (!canvasRef.current || !containerRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const scaleFit = Math.min(rect.width / logicalWidth, rect.height / logicalHeight) * transform.scale;
    const offsetX = (rect.width - logicalWidth * scaleFit) / 2 + transform.x;
    const offsetY = (rect.height - logicalHeight * scaleFit) / 2 + transform.y;
    
    const mouseX = (e.clientX - rect.left - offsetX) / scaleFit;
    const mouseY = (e.clientY - rect.top - offsetY) / scaleFit;
    
    let isHover = false;
    const hoverTargets =
      filters.group !== false ? groupMembers : groupMembers.filter((m) => m.id === 'You');
    for (const m of hoverTargets) {
      if (Math.hypot(m.x - mouseX, m.y - mouseY) < 15 / scaleFit) {
        setHoveredMember(m);
        isHover = true;
        break;
      }
    }
    if (!isHover && hoveredMember) {
      setHoveredMember(null);
    }
    
    if (disableInteraction) {
      containerRef.current.style.cursor = isHover ? 'pointer' : 'default';
    } else if (isHover) {
       containerRef.current.style.cursor = 'pointer';
    } else {
       containerRef.current.style.cursor = isDragging ? 'grabbing' : 'grab';
    }

    if (!isDragging || disableInteraction) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  const handleMouseUp = () => setIsDragging(false);

  const bumpZoom = (direction) => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(
        0.5,
        Math.min(3, direction === 'in' ? prev.scale * 1.12 : prev.scale / 1.12),
      ),
    }));
  };

  return (
    <div ref={containerRef} className={`w-full h-full relative overflow-hidden rounded-2xl bg-white/5 ${disableInteraction ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`} >
      <canvas
        ref={canvasRef}
        className="block touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      {!disableInteraction && (
        <div className="absolute top-3 right-3 z-10 flex flex-col rounded-xl bg-white/95 shadow-md border border-gray-200 overflow-hidden dark:bg-zinc-900/95 dark:border-zinc-700">
          <button
            type="button"
            aria-label="Zoom in"
            className="w-10 h-10 flex items-center justify-center text-lg font-bold leading-none text-gray-800 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-100 dark:hover:bg-zinc-800"
            onClick={() => bumpZoom('in')}
          >
            +
          </button>
          <button
            type="button"
            aria-label="Zoom out"
            className="w-10 h-10 flex items-center justify-center text-lg font-bold leading-none text-gray-800 border-t border-gray-200 hover:bg-gray-100 active:bg-gray-200 dark:text-gray-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            onClick={() => bumpZoom('out')}
          >
            −
          </button>
        </div>
      )}
      {/* Nash badge overlay */}
      {activeRoute && (
        <div
          className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10"
          style={{
            background: '#ECFDF5',
            border: '1px solid #A7F3D0',
            borderRadius: 12,
            padding: '8px 16px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
            color: '#065F46',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 10px rgba(0,0,0,0.08)',
          }}
        >
          <span style={{ color: '#10B981', fontSize: 16 }}>✓</span>
          Smart route: {activeRoute.nashRerouteCount} others rerouted to keep your path clear
        </div>
      )}
    </div>
  );
};
