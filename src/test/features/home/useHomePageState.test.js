import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useHomePageState } from '../../../features/home/useHomePageState';

const mockUseStore = vi.fn();
const mockGenerateActionRecommendation = vi.fn();
const mockEstimateWalkMetersFromPathCost = vi.fn();
const mockGetNashStats = vi.fn();

vi.mock('../../../store/useStore', () => ({
  useStore: (selector) => mockUseStore(selector),
}));

vi.mock('../../../intelligence/comfortScoring', () => ({
  getComfortScore: vi.fn(() => 82),
  getComfortColor: vi.fn(() => '#10B981'),
  normalizeDensityPercent: vi.fn((value) => value),
  COMFORT_THRESHOLDS: {
    good: 70,
    moderate: 40,
  },
}));

vi.mock('../../../intelligence/routingEngine', () => ({
  getNashStats: () => mockGetNashStats(),
}));

vi.mock('../../../services/geminiService', () => ({
  generateActionRecommendation: (...args) => mockGenerateActionRecommendation(...args),
}));

vi.mock('../../../models/venueLayout', () => ({
  estimateWalkMetersFromPathCost: (...args) => mockEstimateWalkMetersFromPathCost(...args),
  getZoneAliasesForGroup: vi.fn(() => ['B4-B6']),
}));

describe('useHomePageState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockGetNashStats.mockReturnValue({ totalRoutes: 7 });
    mockEstimateWalkMetersFromPathCost.mockReturnValue(140);
    mockGenerateActionRecommendation.mockResolvedValue('Take food route now');
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('computes derived state and routes to nearest food destination', async () => {
    const navigate = vi.fn();
    const state = {
      currentFan: { id: 'fan-1', location: 'B4-B6' },
      zones: new Map([['B4-B6', { density: 37 }]]),
      stands: new Map([
        ['S12', { waitTime: 2 }],
        ['S15', { waitTime: 8 }],
      ]),
      simState: { state: 'in_match', halftimeCountdownSeconds: 120, speed: 1 },
      activeRoute: { pathCost: 52 },
      nashRoutingEpoch: 3,
    };
    mockUseStore.mockImplementation((selector) => selector(state));

    const { result } = renderHook(() => useHomePageState(navigate));

    await act(async () => {
      vi.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(result.current.nearestFood).toEqual({ id: 'S12', waitTime: 2 });
    expect(result.current.comfortScore).toBe(82);
    expect(result.current.activeRouteCount).toBe(7);
    expect(result.current.promoWalkMeters).toBe(140);
    expect(result.current.aiRecommendation).toBe('Take food route now');

    await act(async () => {
      await result.current.handleRouteRequest();
    });

    expect(navigate).toHaveBeenCalledWith('/map?dest=S12');
  });

  it('detects egress state and uses fallback route destination', async () => {
    const navigate = vi.fn();
    const state = {
      currentFan: { id: 'fan-2', location: 'B4-B6' },
      zones: new Map([['B4-B6', { density: 20 }]]),
      stands: new Map([['S99', { waitTime: undefined }]]),
      simState: { state: 'post_match', halftimeCountdownSeconds: 10, speed: 1 },
      activeRoute: null,
      nashRoutingEpoch: 1,
    };
    mockUseStore.mockImplementation((selector) => selector(state));

    const { result } = renderHook(() => useHomePageState(navigate));

    expect(result.current.isEgress).toBe(true);
    expect(result.current.nearestFood.id).toBe('--');

    await act(async () => {
      await result.current.handleRouteRequest();
    });

    expect(navigate).toHaveBeenCalledWith('/map?dest=S12');
  });
});
