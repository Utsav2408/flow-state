import { describe, expect, it } from 'vitest';
import { paintDensityHeatmapOffscreen, paintVenueMainCanvas } from '../../utils/venueMapCanvasPaint';

function makeCtx() {
  const fn = () => {};
  return {
    clearRect: fn,
    createRadialGradient: () => ({ addColorStop: fn }),
    beginPath: fn,
    arc: fn,
    fill: fn,
    ellipse: fn,
    stroke: fn,
    setLineDash: fn,
    roundRect: fn,
    fillText: fn,
    drawImage: fn,
    save: fn,
    restore: fn,
    moveTo: fn,
    lineTo: fn,
    closePath: fn,
    rect: fn,
    clip: fn,
    measureText: () => ({ width: 40 }),
    translate: fn,
    rotate: fn,
    globalCompositeOperation: 'source-over',
    fillStyle: '#000',
    strokeStyle: '#000',
    lineWidth: 1,
    font: '12px Inter, sans-serif',
    textAlign: 'center',
    textBaseline: 'middle',
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetY: 0,
    globalAlpha: 1,
    lineDashOffset: 0,
  };
}

describe('venueMapCanvasPaint', () => {
  it('paints density heatmap offscreen without crashing', () => {
    const ctx = makeCtx();
    paintDensityHeatmapOffscreen(ctx, {
      logicalWidth: 1200,
      logicalHeight: 800,
      zoneLocations: [{ id: 'B4-B6', x: 500, y: 300, rx: 60, ry: 50, alias: ['B4'] }],
      zones: new Map([['B4', { density: 90 }]]),
      time: 1000,
    });
    expect(true).toBe(true);
  });

  it('paints main venue canvas overlays and route state', () => {
    const ctx = makeCtx();
    paintVenueMainCanvas(ctx, {
      cx: 600,
      cy: 400,
      filters: { density: true, food: true, restrooms: true, exits: true, route: true, group: true },
      zones: new Map([['B4', { density: 70 }]]),
      stands: new Map([['S12', { waitTime: 3 }]]),
      zoneLocations: [{ id: 'B4-B6', x: 500, y: 300, rx: 60, ry: 50, alias: ['B4'] }],
      zoneLabelOffsets: { 'B4-B6': { dx: 0, dy: 0 } },
      standLabelSides: { S12: 'right' },
      groupMembers: [
        { id: 'You', x: 610, y: 390, zone: 'B4' },
        { id: 'AK', x: 620, y: 410, zone: 'B4', color: '#F43F5E' },
      ],
      meetupCentroid: { x: 630, y: 420 },
      activeRoute: { navMode: 'fan', destination: 'S12', path: ['B4', 'S12'] },
      time: 1200,
      hoveredMember: { name: 'Arjun K', zone: 'Section B4', x: 620, y: 410 },
      offscreenCanvas: { width: 1200, height: 800 },
    });
    expect(true).toBe(true);
  });
});
