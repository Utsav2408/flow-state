import { describe, it, expect } from 'vitest';
import {
  getNodeCanvasPos,
  estimateWalkMetersFromPathCost,
  getZoneAliasesForGroup,
  getClosestStandToPoint,
  LOGICAL_MAP,
} from './venueLayout';

describe('getNodeCanvasPos', () => {
  it('maps zone node to group center', () => {
    const p = getNodeCanvasPos('B4');
    expect(p).not.toBeNull();
    expect(p.x).toBeCloseTo(LOGICAL_MAP.cx + 220, 5);
  });

  it('maps stand id to layout coords', () => {
    const p = getNodeCanvasPos('S3');
    expect(p).not.toBeNull();
    expect(p.x).toBeDefined();
  });

  it('returns null for unknown id', () => {
    expect(getNodeCanvasPos('UNKNOWN')).toBeNull();
  });
});

describe('estimateWalkMetersFromPathCost', () => {
  it('returns null for invalid input', () => {
    expect(estimateWalkMetersFromPathCost(null)).toBeNull();
    expect(estimateWalkMetersFromPathCost(Number.NaN)).toBeNull();
  });

  it('scales path cost to meters with a floor', () => {
    expect(estimateWalkMetersFromPathCost(100)).toBe(Math.max(20, Math.round(220)));
  });
});

describe('getZoneAliasesForGroup', () => {
  it('returns aliases for known group', () => {
    expect(getZoneAliasesForGroup('B4-B6')).toEqual(['B4', 'B5', 'B6']);
  });

  it('returns empty array for unknown group', () => {
    expect(getZoneAliasesForGroup('X1-X9')).toEqual([]);
  });
});

describe('getClosestStandToPoint', () => {
  it('returns a stand near the logical map center', () => {
    const empty = new Map();
    const r = getClosestStandToPoint(empty, LOGICAL_MAP.cx, LOGICAL_MAP.cy);
    expect(r.id).toBeTruthy();
    expect(Number.isFinite(r.distance)).toBe(true);
  });
});
