import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useMapRoutingState } from '../../../features/map/useMapRoutingState';

const mockUseStore = vi.fn();
const mockRequestRoute = vi.fn();
const mockGetNashStats = vi.fn();
const mockGetShortestPath = vi.fn();
const mockGetNeighbors = vi.fn();
const mockGetNodeCanvasPos = vi.fn();

const setActiveRoute = vi.fn();
const clearActiveRoute = vi.fn();

vi.mock('../../../store/useStore', () => ({
  useStore: (selector) => mockUseStore(selector),
}));

vi.mock('../../../models/venueGraph', () => ({
  default: {
    getShortestPath: (...args) => mockGetShortestPath(...args),
    getNeighbors: (...args) => mockGetNeighbors(...args),
  },
}));

vi.mock('../../../intelligence/routingEngine', () => ({
  requestRoute: (...args) => mockRequestRoute(...args),
  getNashStats: () => mockGetNashStats(),
}));

vi.mock('../../../models/venueLayout', () => ({
  getNodeCanvasPos: (...args) => mockGetNodeCanvasPos(...args),
}));

describe('useMapRoutingState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUseStore.mockImplementation((selector) =>
      selector({
        zones: new Map([['B4', { density: 28, name: 'Zone B4' }]]),
        stands: new Map([
          ['S12', { waitTime: 2 }],
          ['S15', { waitTime: 5 }],
        ]),
        currentFan: { id: 'fan-1', location: 'B4-B6' },
        setActiveRoute,
        clearActiveRoute,
      })
    );
    mockGetNashStats.mockReturnValue({ nashRerouteCount: 222 });
    mockRequestRoute.mockResolvedValue({
      destination: 'S12',
      path: ['B4', 'C1', 'S12'],
      pathCost: 42,
      etaMinutes: 2,
      nashRerouteCount: 333,
      alternatives: [
        { dest: 'S15', cost: 55 },
        { dest: 'S16', cost: 70 },
      ],
    });
    mockGetShortestPath.mockImplementation((from, to) => {
      if (to === 'S15') return ['B4', 'D1', 'S15'];
      if (to === 'S16') return ['B4', 'E1', 'S16'];
      return ['B4', 'C1', to];
    });
    mockGetNeighbors.mockImplementation((node) => {
      if (node === 'B4') return [{ node: 'C1', distance: 10 }, { node: 'D1', distance: 20 }, { node: 'E1', distance: 25 }];
      if (node === 'C1') return [{ node: 'S12', distance: 15 }];
      if (node === 'D1') return [{ node: 'S15', distance: 18 }];
      if (node === 'E1') return [{ node: 'S16', distance: 20 }];
      return [];
    });
    mockGetNodeCanvasPos.mockImplementation((nodeId) => {
      const positions = {
        B4: { x: 100, y: 100 },
        C1: { x: 150, y: 120 },
        D1: { x: 160, y: 90 },
        E1: { x: 170, y: 130 },
        S12: { x: 220, y: 140 },
        S15: { x: 230, y: 95 },
        S16: { x: 240, y: 150 },
      };
      return positions[nodeId] || null;
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('builds route options for fastest food and updates active route state', async () => {
    const navigate = vi.fn();
    const searchParams = new URLSearchParams('');
    const { result } = renderHook(() => useMapRoutingState({ navigate, searchParams }));

    act(() => {
      result.current.toggleFilter('food');
    });
    expect(result.current.filters.food).toBe(false);

    await act(async () => {
      await result.current.handleFastestFoodRoute();
    });

    expect(result.current.isRouteSectionOpen).toBe(true);
    expect(result.current.navigationState.destinationId).toBe('S12');
    expect(result.current.turnByTurn).toHaveLength(2);
    expect(setActiveRoute).toHaveBeenCalledWith(
      expect.objectContaining({
        destination: 'S12',
        navMode: 'fan',
      })
    );
  });

  it('clears navigation and strips search params when destination is in URL', async () => {
    const navigate = vi.fn();
    const searchParams = new URLSearchParams('dest=s12');
    const { result } = renderHook(() => useMapRoutingState({ navigate, searchParams }));

    await act(async () => {
      vi.runOnlyPendingTimers();
      await Promise.resolve();
    });

    expect(result.current.isRouteSectionOpen).toBe(true);

    act(() => {
      result.current.cancelNavigation();
    });

    expect(clearActiveRoute).toHaveBeenCalledTimes(1);
    expect(navigate).toHaveBeenCalledWith('/map', { replace: true });
  });
});
