import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useOperatorDashboardState } from '../../../features/operator/useOperatorDashboardState';

const mockUseStore = vi.fn();
const mockStartSimulation = vi.fn();
const mockTriggerEvent = vi.fn();
const mockGetSimStats = vi.fn();
const mockGetNashStats = vi.fn();
const mockSet = vi.fn(() => Promise.resolve());
const mockRef = vi.fn(() => 'db-ref');

const setSimState = vi.fn();
const subscribeToAlerts = vi.fn(() => vi.fn());
const setSimStateFromGetState = vi.fn();

vi.mock('../../../store/useStore', () => {
  const useStore = (selector) => mockUseStore(selector);
  useStore.getState = () => ({
    setSimState: setSimStateFromGetState,
  });
  return { useStore };
});

vi.mock('../../../firebase', () => ({
  db: { key: 'mock-db' },
  ref: (...args) => mockRef(...args),
  set: (...args) => mockSet(...args),
}));

vi.mock('../../../simulation/crowdSimulator', () => ({
  startSimulation: () => mockStartSimulation(),
  triggerEvent: (...args) => mockTriggerEvent(...args),
  getSimStats: () => mockGetSimStats(),
}));

vi.mock('../../../intelligence/routingEngine', () => ({
  getNashStats: () => mockGetNashStats(),
}));

describe('useOperatorDashboardState', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();

    mockUseStore.mockImplementation((selector) =>
      selector({
        zones: new Map([
          ['B4', { density: 35 }],
          ['B5', { density: 45 }],
          ['B6', { density: 55 }],
        ]),
        stands: new Map([
          ['S12', { waitTime: 2 }],
          ['S15', { waitTime: 9 }],
        ]),
        simState: { state: 'live_play', postMatchElapsedSecs: 5 },
        alerts: [{ message: 'store alert', severity: 'medium', timestamp: Date.now() }],
        setSimState,
        nashRoutingEpoch: 1,
        subscribeToAlerts,
      })
    );

    mockGetSimStats.mockReturnValue({
      activeCount: 1000,
      queuingCount: 200,
      total: 40000,
      phase: 'live_play',
      exitedCount: 5000,
    });
    mockGetNashStats.mockReturnValue({
      totalRoutes: 42,
      nashRerouteCount: 1234,
    });
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('starts simulation, computes summary state, and handles trigger events', () => {
    const { result } = renderHook(() => useOperatorDashboardState());

    expect(mockStartSimulation).toHaveBeenCalledTimes(1);
    expect(subscribeToAlerts).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(1200);
    });

    expect(result.current.fanCount).toBe(40000);
    expect(result.current.fanActiveRoutes).toBe(42);
    expect(result.current.aiActionTitle).toBe('Grab food now - ideal window');
    expect(result.current.allAlerts.length).toBeGreaterThan(0);

    act(() => {
      result.current.updateSimSpeed(3);
    });
    expect(setSimStateFromGetState).toHaveBeenCalledWith({ speed: 3 });

    act(() => {
      result.current.handleTriggerEvent('post_match');
    });

    expect(mockTriggerEvent).toHaveBeenCalledWith('post_match');
    expect(setSimState).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'post_match',
        postMatchElapsedSecs: 0,
      })
    );
    expect(result.current.activeTriggerEvent).toBe('post_match');
  });
});
