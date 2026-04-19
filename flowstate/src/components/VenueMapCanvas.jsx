import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useStore } from '../store/useStore';
import {
  LOGICAL_MAP,
  ZONE_GROUPS,
  STAND_LAYOUT,
} from '../models/venueLayout';
import { computeZoneLabelOffsets, computeStandLabelSides } from '../utils/mapLabelLayout';
import {
  paintDensityHeatmapOffscreen,
  paintVenueMainCanvas,
} from '../utils/venueMapCanvasPaint';

export const VenueMapCanvas = ({
  filters,
  disableInteraction = false,
  showMeetupCentroid = false,
  customMeetupPoint = null,
}) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const offscreenCanvasRef = useRef(document.createElement('canvas'));
  const zones = useStore((state) => state.zones);
  const stands = useStore((state) => state.stands);
  const activeRoute = useStore((state) => state.activeRoute);
  const groupMembers = useStore((state) => state.groupMembers);

  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [hoveredMember, setHoveredMember] = useState(null);
  const requestRef = useRef();
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  const [time, setTime] = useState(0);

  const logicalWidth = LOGICAL_MAP.width;
  const logicalHeight = LOGICAL_MAP.height;
  const cx = LOGICAL_MAP.cx;
  const cy = LOGICAL_MAP.cy;

  const zoneLocations = ZONE_GROUPS;

  const zoneLabelOffsets = useMemo(
    () => computeZoneLabelOffsets(ZONE_GROUPS, STAND_LAYOUT, { cx, cy }),
    [cx, cy],
  );

  const standLabelSides = useMemo(
    () => computeStandLabelSides(STAND_LAYOUT, ZONE_GROUPS, zoneLabelOffsets),
    [zoneLabelOffsets],
  );

  const meetupCentroid = useMemo(() => {
    if (customMeetupPoint) return customMeetupPoint;
    if (!showMeetupCentroid || !groupMembers.length) return null;
    const sx = groupMembers.reduce((a, m) => a + m.x, 0) / groupMembers.length;
    const sy = groupMembers.reduce((a, m) => a + m.y, 0) / groupMembers.length;
    return { x: sx, y: sy };
  }, [groupMembers, showMeetupCentroid, customMeetupPoint]);

  useEffect(() => {
    const animate = () => {
      setTime(Date.now());
      requestRef.current = requestAnimationFrame(animate);
    };
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, []);

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

  useEffect(() => {
    const osCanvas = offscreenCanvasRef.current;
    osCanvas.width = logicalWidth;
    osCanvas.height = logicalHeight;
    const ctx = osCanvas.getContext('2d', { alpha: true });
    if (filters.density !== false) {
      paintDensityHeatmapOffscreen(ctx, {
        logicalWidth,
        logicalHeight,
        zoneLocations,
        zones,
        time,
      });
    } else {
      ctx.clearRect(0, 0, logicalWidth, logicalHeight);
    }
  }, [filters.density, zones, logicalWidth, logicalHeight, time, zoneLocations]);

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

    const scaleFit =
      Math.min(rect.width / logicalWidth, rect.height / logicalHeight) * transform.scale;
    const offsetX = (rect.width - logicalWidth * scaleFit) / 2 + transform.x;
    const offsetY = (rect.height - logicalHeight * scaleFit) / 2 + transform.y;

    ctx.translate(offsetX, offsetY);
    ctx.scale(scaleFit, scaleFit);

    paintVenueMainCanvas(ctx, {
      cx,
      cy,
      filters,
      zones,
      stands,
      zoneLocations,
      zoneLabelOffsets,
      standLabelSides,
      groupMembers,
      meetupCentroid,
      activeRoute,
      time,
      hoveredMember,
      offscreenCanvas: offscreenCanvasRef.current,
    });

    ctx.restore();
  }, [
    filters,
    transform,
    zones,
    stands,
    activeRoute,
    logicalWidth,
    logicalHeight,
    zoneLocations,
    groupMembers,
    time,
    hoveredMember,
    cx,
    cy,
    meetupCentroid,
    containerSize,
    zoneLabelOffsets,
    standLabelSides,
  ]);

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
    const scaleFit =
      Math.min(rect.width / logicalWidth, rect.height / logicalHeight) * transform.scale;
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
    setTransform((prev) => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
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
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden rounded-2xl bg-white/5 ${
        disableInteraction ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'
      }`}
    >
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
