import { DENSITY_UI } from '../config/comfortConfig';
import {
  LOGICAL_MAP,
  STAND_LAYOUT,
  RESTROOM_LAYOUT,
  GATES_LAYOUT,
  getNodeCanvasPos,
  FAN_MAP_PITCH_HALFW,
  FAN_MAP_INNER_GROUND_RADIUS,
} from '../models/venueLayout';

/**
 * Fan app map: radial density blobs on an offscreen canvas (logical coords).
 */
export function paintDensityHeatmapOffscreen(ctx, {
  logicalWidth,
  logicalHeight,
  zoneLocations,
  zones,
  time,
}) {
  ctx.clearRect(0, 0, logicalWidth, logicalHeight);

  zoneLocations.forEach((zp) => {
    let totalVal = 0;
    let count = 0;
    zp.alias.forEach((z) => {
      const zd = zones.get(z);
      if (zd && zd.density !== undefined) {
        totalVal += zd.density;
        count++;
      }
    });
    const density = count > 0 ? Math.round(totalVal / count) : 0;

    let colorCenter;
    let colorEdge;
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

    let pulseRadius = 1;
    if (isPulsing) {
      pulseRadius = 1 + Math.sin(time / 200) * 0.15;
    }

    ctx.globalCompositeOperation = 'screen';
    const grad = ctx.createRadialGradient(
      zp.x,
      zp.y,
      10,
      zp.x,
      zp.y,
      Math.max(zp.rx, zp.ry) * 2 * pulseRadius,
    );
    grad.addColorStop(0, colorCenter);
    grad.addColorStop(1, colorEdge);

    ctx.beginPath();
    ctx.arc(zp.x, zp.y, Math.max(zp.rx, zp.ry) * 2 * pulseRadius, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();
  });

  ctx.globalCompositeOperation = 'destination-out';
  ctx.beginPath();
  ctx.arc(LOGICAL_MAP.cx, LOGICAL_MAP.cy, FAN_MAP_INNER_GROUND_RADIUS, 0, 2 * Math.PI);
  ctx.fillStyle = '#000';
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
}

/**
 * Stadium base, overlay heatmap image, labels, pins, route, tooltip (logical coords).
 */
export function paintVenueMainCanvas(
  ctx,
  {
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
    offscreenCanvas,
  },
) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, 350, 350, 0, 0, 2 * Math.PI);
  ctx.fillStyle = '#F5F5F0';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#E0E0E0';
  ctx.stroke();

  ctx.beginPath();
  ctx.setLineDash([10, 10]);
  ctx.ellipse(cx, cy, FAN_MAP_INNER_GROUND_RADIUS, FAN_MAP_INNER_GROUND_RADIUS, 0, 0, 2 * Math.PI);
  ctx.strokeStyle = '#BDBDBD';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);

  const ph = FAN_MAP_PITCH_HALFW;
  ctx.beginPath();
  ctx.roundRect(cx - ph, cy - ph, ph * 2, ph * 2, 10);
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

  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(offscreenCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  const showDensity = filters.density !== false;
  const showFood = filters.food !== false;
  const showRestrooms = filters.restrooms !== false;
  const showExits = filters.exits !== false;
  const showRoute = filters.route !== false;

  const youM = groupMembers.find((m) => m.id === 'You');
  const youX = youM?.x ?? cx + 150;
  const youY = youM?.y ?? cy - 100;
  const isFanNavigation = activeRoute?.navMode === 'fan';

  if (showRoute && (activeRoute?.path || activeRoute?.pathPoints)) {
    const rawRoutePoints =
      Array.isArray(activeRoute?.pathPoints) && activeRoute.pathPoints.length
        ? activeRoute.pathPoints
        : activeRoute?.path
          ? buildRoutePointsFromNodes(activeRoute.path)
          : [];
    const pts = [{ x: youX, y: youY }, ...rawRoutePoints];

    if (pts.length >= 2) {
      ctx.save();
      ctx.setLineDash([8, 4]);
      ctx.lineDashOffset = -(time / 45);
      ctx.strokeStyle = '#378ADD';
      ctx.lineWidth = 3;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalAlpha = 0.95;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i += 1) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      const { point, angle } = getRouteMidpointAndAngle(pts);
      drawDirectionArrow(ctx, point.x, point.y, angle, '#378ADD');

      const dest = pts[pts.length - 1];
      const pulse = 1 + Math.sin(time / 220) * 0.18;
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#378ADD';
      ctx.beginPath();
      ctx.arc(dest.x, dest.y, 16 * pulse, 0, 2 * Math.PI);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();
    }
  }

  if (showDensity) {
    zoneLocations.forEach((zp) => {
      let totalVal = 0;
      let count = 0;
      zp.alias.forEach((z) => {
        const zd = zones.get(z);
        if (zd && zd.density !== undefined) {
          totalVal += zd.density;
          count++;
        }
      });
      const density = count > 0 ? Math.round(totalVal / count) : 0;

      const off = zoneLabelOffsets[zp.id] || { dx: 0, dy: 0 };
      const lx = zp.x + off.dx;
      const ly = zp.y + off.dy;

      ctx.fillStyle = '#404040';
      ctx.font = 'bold 16px Inter, sans-serif';
      ctx.fillText(zp.id, lx, ly - 10);
      ctx.font = '14px Inter, sans-serif';
      ctx.fillText(`${density}%`, lx, ly + 10);
    });
  }

  if (showFood) {
    STAND_LAYOUT.forEach((sp) => {
      const standData = stands.get(sp.id);
      const waitTime = standData ? standData.waitTime : '?';
      const isRouteDestination = activeRoute?.destination === sp.id;
      const standSize = isRouteDestination ? 24 : 20;
      const standHalf = standSize / 2;
      const pulse = isRouteDestination ? 1 + Math.sin(time / 220) * 0.18 : 1;

      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.roundRect(sp.x - standHalf, sp.y - standHalf, standSize, standSize, 4);
      ctx.fill();

      if (isRouteDestination) {
        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, 18 * pulse, 0, 2 * Math.PI);
        ctx.fillStyle = '#378ADD';
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = '#404040';
      ctx.font = '12px Inter, sans-serif';
      const side = standLabelSides[sp.id] || 'right';
      if (side === 'left') {
        ctx.textAlign = 'right';
        ctx.fillText(`${sp.id} - ${waitTime}m`, sp.x - 15, sp.y);
      } else {
        ctx.textAlign = 'left';
        ctx.fillText(`${sp.id} - ${waitTime}m`, sp.x + 15, sp.y);
      }
      ctx.textAlign = 'center';
    });
  }

  if (showRestrooms) {
    RESTROOM_LAYOUT.forEach((rr) => {
      const isRouteDestination = activeRoute?.destination === rr.id;
      const pulse = isRouteDestination ? 1 + Math.sin(time / 220) * 0.15 : 1;
      const baseR = isRouteDestination ? 10 : 8;
      if (isRouteDestination) {
        ctx.save();
        ctx.globalAlpha = 0.32;
        ctx.beginPath();
        ctx.arc(rr.x, rr.y, 18 * pulse, 0, 2 * Math.PI);
        ctx.fillStyle = '#06B6D4';
        ctx.fill();
        ctx.restore();
      }
      ctx.beginPath();
      ctx.arc(rr.x, rr.y, baseR, 0, 2 * Math.PI);
      ctx.fillStyle = '#0EA5E9';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 9px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('R', rr.x, rr.y);
    });
  }

  if (showExits) {
    ctx.fillStyle = '#9CA3AF';
    ctx.font = '14px Inter, sans-serif';
    GATES_LAYOUT.forEach((g) => {
      ctx.fillText(`${g.id} (${g.shortLabel})`, g.x, g.y);
    });
  }

  ctx.beginPath();
  const youRadius = isFanNavigation ? 9.5 + Math.sin(time / 250) * 0.8 : 8;
  ctx.arc(youX, youY, youRadius, 0, 2 * Math.PI);
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

  if (isFanNavigation) {
    ctx.save();
    ctx.globalAlpha = 0.28;
    ctx.beginPath();
    ctx.arc(youX, youY, 14 + Math.sin(time / 220) * 1.2, 0, 2 * Math.PI);
    ctx.fillStyle = '#2563EB';
    ctx.fill();
    ctx.restore();
  }

  if (filters.group !== false) {
    groupMembers
      .filter((m) => m.id !== 'You')
      .forEach((m) => {
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

  if (hoveredMember) {
    ctx.save();
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0,0,0,0.15)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;

    const textWidth = Math.max(
      ctx.measureText(hoveredMember.name).width,
      ctx.measureText(hoveredMember.zone).width,
    );
    const ttWidth = Math.max(120, textWidth + 30);
    const ttHeight = 44;
    const ttX = hoveredMember.x - ttWidth / 2;
    const ttY = hoveredMember.y - 65;

    ctx.beginPath();
    ctx.roundRect(ttX, ttY, ttWidth, ttHeight, 8);
    ctx.fill();

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
}

function buildRoutePointsFromNodes(path) {
  const points = [];
  for (const nid of path || []) {
    const p = getNodeCanvasPos(nid);
    if (!p) continue;
    const last = points[points.length - 1];
    if (!last || Math.abs(last.x - p.x) > 5 || Math.abs(last.y - p.y) > 5) {
      points.push(p);
    }
  }
  return points;
}

function getRouteMidpointAndAngle(points) {
  let totalLength = 0;
  for (let i = 1; i < points.length; i += 1) {
    totalLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  const half = totalLength / 2;
  let walked = 0;
  for (let i = 1; i < points.length; i += 1) {
    const a = points[i - 1];
    const b = points[i];
    const seg = Math.hypot(b.x - a.x, b.y - a.y);
    if (walked + seg >= half) {
      const t = seg ? (half - walked) / seg : 0;
      return {
        point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
        angle: Math.atan2(b.y - a.y, b.x - a.x),
      };
    }
    walked += seg;
  }
  const last = points[points.length - 1];
  const prev = points[Math.max(0, points.length - 2)];
  return { point: last, angle: Math.atan2(last.y - prev.y, last.x - prev.x) };
}

function drawDirectionArrow(ctx, x, y, angle, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, -4.5);
  ctx.lineTo(-6, 4.5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
