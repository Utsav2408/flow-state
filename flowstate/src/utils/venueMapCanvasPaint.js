import { DENSITY_UI } from '../config/comfortConfig';
import { STAND_LAYOUT, GATES_LAYOUT, getNodeCanvasPos } from '../models/venueLayout';

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

  ctx.globalCompositeOperation = 'screen';
  ctx.drawImage(offscreenCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';

  const showDensity = filters.density !== false;
  const showFood = filters.food !== false;
  const showExits = filters.exits !== false;

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

      ctx.fillStyle = '#3B82F6';
      ctx.beginPath();
      ctx.roundRect(sp.x - 10, sp.y - 10, 20, 20, 4);
      ctx.fill();

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

  if (activeRoute?.path) {
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
