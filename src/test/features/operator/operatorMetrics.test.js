import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  computeAvgDensity,
  computeAvgWait,
  densityToComfort,
  formatSimTime,
  formatTimeAgo,
  formatWallClock,
} from '../../../features/operator/operatorMetrics';

describe('operatorMetrics', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-20T12:00:00.000Z'));
  });

  it('converts density into bounded comfort score', () => {
    expect(densityToComfort(0)).toBe(100);
    expect(densityToComfort(40.4)).toBe(60);
    expect(densityToComfort(150)).toBe(0);
    expect(densityToComfort(-10)).toBe(100);
  });

  it('formats simulation time as mm:ss', () => {
    expect(formatSimTime(0)).toBe('00:00');
    expect(formatSimTime(65.9)).toBe('01:05');
    expect(formatSimTime(600)).toBe('10:00');
  });

  it('formats wall clock and relative time labels', () => {
    const ts = Date.now() - 45_000;
    expect(formatWallClock(ts)).toContain(':');
    expect(formatWallClock(null)).toBe('');
    expect(formatTimeAgo(ts)).toBe('45s ago');
    expect(formatTimeAgo(Date.now() - 5 * 60_000)).toBe('5m ago');
    expect(formatTimeAgo(Date.now() - 2 * 60 * 60_000)).toBe('2h ago');
    expect(formatTimeAgo(undefined)).toBe('');
  });

  it('computes average wait and density across maps', () => {
    const stands = new Map([
      ['S1', { waitTime: 2 }],
      ['S2', { waitTime: 6 }],
      ['S3', {}],
    ]);
    const zones = new Map([
      ['A1', { density: 20 }],
      ['B1', { density: 50 }],
      ['C1', {}],
    ]);

    expect(computeAvgWait(stands)).toBe(4);
    expect(computeAvgWait(new Map())).toBe(0);
    expect(computeAvgDensity(zones)).toBe(35);
    expect(computeAvgDensity(new Map())).toBe(0);
  });
});
