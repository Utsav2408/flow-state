import { describe, it, expect } from 'vitest';
import { computeZoneLabelOffsets, computeStandLabelSides } from './mapLabelLayout';

describe('computeZoneLabelOffsets', () => {
  it('returns dx/dy entries bounded for each zone id', () => {
    const zones = [
      { id: 'Z1', x: 100, y: 100 },
      { id: 'Z2', x: 500, y: 400 },
    ];
    const stands = [{ id: 'S1', x: 120, y: 105 }];
    const out = computeZoneLabelOffsets(zones, stands, { cx: 400, cy: 400 });

    expect(out.Z1).toEqual(expect.objectContaining({ dx: expect.any(Number), dy: expect.any(Number) }));
    expect(out.Z2).toEqual(expect.objectContaining({ dx: expect.any(Number), dy: expect.any(Number) }));
    expect(Math.abs(out.Z1.dx)).toBeLessThanOrEqual(88);
    expect(Math.abs(out.Z1.dy)).toBeLessThanOrEqual(88);
  });
});

describe('computeStandLabelSides', () => {
  it('resolves left or right per stand id', () => {
    const zones = [{ id: 'Z1', x: 200, y: 200 }];
    const stands = [{ id: 'S7', x: 300, y: 300 }];
    const offsets = { Z1: { dx: 0, dy: 0 } };
    const sides = computeStandLabelSides(stands, zones, offsets);

    expect(sides.S7 === 'left' || sides.S7 === 'right').toBe(true);
  });
});
