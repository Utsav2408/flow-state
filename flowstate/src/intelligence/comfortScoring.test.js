import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  normalizeDensityPercent,
  getComfortColor,
  getComfortLabel,
  getComfortScore,
} from './comfortScoring';
import { COMFORT_THRESHOLDS } from '../config/comfortConfig';
import { useStore } from '../store/useStore';

describe('normalizeDensityPercent', () => {
  it('maps fraction in (0,1) to percent', () => {
    expect(normalizeDensityPercent(0.52)).toBe(52);
  });

  it('passes through integer percent', () => {
    expect(normalizeDensityPercent(73)).toBe(73);
  });

  it('uses default guess for nullish', () => {
    expect(normalizeDensityPercent(null)).toBeTypeOf('number');
  });
});

describe('getComfortColor', () => {
  it('returns green at or above good threshold', () => {
    expect(getComfortColor(COMFORT_THRESHOLDS.good)).toBe('#22C55E');
  });

  it('returns amber in moderate band', () => {
    expect(getComfortColor(COMFORT_THRESHOLDS.moderate)).toBe('#F59E0B');
  });

  it('returns red below moderate', () => {
    expect(getComfortColor(0)).toBe('#EF4444');
  });
});

describe('getComfortLabel', () => {
  it('returns expected labels', () => {
    expect(getComfortLabel(100)).toBe('green');
    expect(getComfortLabel(COMFORT_THRESHOLDS.moderate)).toBe('amber');
    expect(getComfortLabel(0)).toBe('red');
  });
});

describe('getComfortScore', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    useStore.setState({
      zones: new Map([
        ['B4', { density: 40 }],
        ['B5', { density: 40 }],
        ['B6', { density: 40 }],
      ]),
      stands: new Map([['S3', { waitTime: 5 }]]),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns score in 0–100 for a zone group', () => {
    const s = getComfortScore('B4-B6');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });

  it('handles single zone id', () => {
    useStore.setState({
      zones: new Map([['C1', { density: 30 }]]),
      stands: new Map(),
    });
    const s = getComfortScore('C1');
    expect(s).toBeGreaterThanOrEqual(0);
    expect(s).toBeLessThanOrEqual(100);
  });
});
