import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';

export const VenueMapCanvas = ({ filters }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(document.createElement('canvas'));
  const zones = useStore(state => state.zones);
  const stands = useStore(state => state.stands);
  const activeRoute = useStore(state => state.activeRoute);
  
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredMember, setHoveredMember] = useState(null);
  const requestRef = useRef();
  
  // Animation pulse clock
  const [time, setTime] = useState(0);

  // Logical map size
  const logicalWidth = 800;
  const logicalHeight = 800;
  const cx = logicalWidth / 2;
  const cy = logicalHeight / 2;

  // Static positions matching definitions
  const zoneLocations = useMemo(() => ([
    { id: 'A1-A4', x: cx - 220, y: cy - 100, rx: 60, ry: 60, alias: ['A1','A2','A3','A4'] },
    { id: 'B1-B3', x: cx, y: cy - 250, rx: 80, ry: 40, alias: ['B1','B2','B3'] },
    { id: 'B4-B6', x: cx + 220, y: cy - 100, rx: 70, ry: 50, alias: ['B4','B5','B6'] },
    { id: 'C1-C3', x: cx + 220, y: cy + 150, rx: 80, ry: 60, alias: ['C1','C2','C3'] },
    { id: 'C4-C6', x: cx, y: cy + 250, rx: 90, ry: 45, alias: ['C4','C5','C6'] },
    { id: 'D1-D3', x: cx - 200, y: cy + 150, rx: 70, ry: 60, alias: ['D1','D2','D3'] }
  ]), [cx, cy]);

  const standPositions = useMemo(() => ([
    { id: 'S3', x: cx - 120, y: cy - 200 },
    { id: 'S5', x: cx - 160, y: cy + 50 },
    { id: 'S7', x: cx + 150, y: cy - 200 },
    { id: 'S12', x: cx + 160, y: cy + 60 }
  ]), [cx, cy]);

  const groupMembers = useMemo(() => ([
    { id: 'AK', name: 'Arjun K', x: cx + 110, y: cy - 130, zone: 'Section B4, near Stand 3', color: '#F43F5E' },
    { id: 'RS', name: 'Riya S', x: cx - 180, y: cy - 80, zone: 'Restroom block A', color: '#D97706' },
    { id: 'PV', name: 'Pradeep V', x: cx + 30, y: cy + 180, zone: 'South concourse', color: '#10B981' }
  ]), [cx, cy]);

  // ── Node position helper for route drawing ────────────────────────────
  const getNodePos = (nodeId) => {
    const zoneMap = {
      A1:'A1-A4', A2:'A1-A4', A3:'A1-A4', A4:'A1-A4',
      B1:'B1-B3', B2:'B1-B3', B3:'B1-B3',
      B4:'B4-B6', B5:'B4-B6', B6:'B4-B6',
      C1:'C1-C3', C2:'C1-C3', C3:'C1-C3',
      C4:'C4-C6', C5:'C4-C6', C6:'C4-C6',
      D1:'D1-D3', D2:'D1-D3', D3:'D1-D3',
    };
    const gid = zoneMap[nodeId];
    if (gid) {
      const zl = zoneLocations.find(z => z.id === gid);
      if (zl) return { x: zl.x, y: zl.y };
    }
    const sp = standPositions.find(s => s.id === nodeId);
    if (sp) return { x: sp.x, y: sp.y };
    return null;
  };

  // Handle Request Animation Frame for pulse
  useEffect(() => {
    const animate = () => {
      setTime(Date.now());
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
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
        if (density < 40) {
            colorCenter = 'rgba(159, 225, 203, 0.8)';
            colorEdge = 'rgba(159, 225, 203, 0)';
        } else if (density <= 70) {
            colorCenter = 'rgba(250, 199, 117, 0.8)';
            colorEdge = 'rgba(250, 199, 117, 0)';
        } else {
            colorCenter = 'rgba(240, 149, 149, 0.9)';
            colorEdge = 'rgba(240, 149, 149, 0)';
            if (density > 80) isPulsing = true;
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
      standPositions.forEach(sp => {
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
      ctx.fillText('Gate 1', cx - 300, cy - 300);
      ctx.fillText('Gate 2', cx + 300, cy - 300);
      ctx.fillText('Gate 3', cx + 300, cy + 300);
      ctx.fillText('Gate 4', cx - 300, cy + 300);
    }

    // "You" marker
    const youX = cx + 150, youY = cy - 100;
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

    // Render Group Members
    if (filters.group !== false) {
      groupMembers.forEach(m => {
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

    // ── Route overlay (animated dashed blue path) ────────────────────
    if (activeRoute?.path) {
      // Build deduplicated position array starting from "You"
      const pts = [{ x: youX, y: youY }];
      for (const nid of activeRoute.path) {
        const p = getNodePos(nid);
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

  }, [filters, transform, zones, stands, activeRoute, logicalWidth, logicalHeight, zoneLocations, standPositions, groupMembers, time, hoveredMember]);

  const handleMouseDown = (e) => {
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
    for (const m of groupMembers) {
      if (Math.hypot(m.x - mouseX, m.y - mouseY) < 15 / scaleFit) {
        setHoveredMember(m);
        isHover = true;
        break;
      }
    }
    if (!isHover && hoveredMember) {
      setHoveredMember(null);
    }
    
    if (isHover) {
       containerRef.current.style.cursor = 'pointer';
    } else {
       containerRef.current.style.cursor = isDragging ? 'grabbing' : 'grab';
    }

    if (!isDragging) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setTransform(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    setDragStart({ x: e.clientX, y: e.clientY });
  };
  const handleMouseUp = () => setIsDragging(false);
  const handleWheel = (e) => {
    e.preventDefault();
    const scaleFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(prev => ({ ...prev, scale: Math.max(0.5, Math.min(3, prev.scale * scaleFactor)) }));
  };

  return (
    <div ref={containerRef} className="w-full h-full relative cursor-grab active:cursor-grabbing overflow-hidden rounded-2xl bg-white/5" >
      <canvas
        ref={canvasRef}
        className="block touch-none"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />
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
