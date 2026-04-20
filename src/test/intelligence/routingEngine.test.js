import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const TEST_BATCH_MS = 25;

async function loadRoutingEngine({ location = 'B4-B6', stands = new Map() } = {}) {
  vi.resetModules();

  const bumpNashRoutingEpoch = vi.fn();

  const nodes = new Map([
    ['B4', { id: 'B4', type: 'zone' }],
    ['S1', { id: 'S1', type: 'stand' }],
    ['G1', { id: 'G1', type: 'gate' }],
  ]);
  const adjacencyList = new Map([
    ['B4', [
      { node: 'S1', distance: 10, currentLoad: 0 },
      { node: 'G1', distance: 6, currentLoad: 0 },
    ]],
    ['S1', [{ node: 'B4', distance: 10, currentLoad: 0 }]],
    ['G1', [{ node: 'B4', distance: 6, currentLoad: 0 }]],
  ]);

  vi.doMock('../../models/venueGraph', () => ({
    default: { nodes, adjacencyList },
  }));
  vi.doMock('../../store/useStore', () => ({
    useStore: {
      getState: () => ({
        currentFan: { location },
        stands,
        bumpNashRoutingEpoch,
      }),
    },
  }));
  vi.doMock('../../config/routingConstants', () => ({
    CONGESTION_LOAD_SQ_COEFF: 5,
    EDGE_LOAD_INCREMENT: 0.015,
    NASH_BATCH_MS: TEST_BATCH_MS,
    DEFAULT_STAND_QUEUE_CAP: 200,
    DEFAULT_FAN_GRAPH_ZONE: 'B4',
    REROUTE_DISPLAY_BASE: 280,
    REROUTE_DISPLAY_PER_CONFLICT: 95,
    REROUTE_DISPLAY_PER_REQ: 45,
  }));

  const module = await import('../../intelligence/routingEngine');
  return { ...module, bumpNashRoutingEpoch };
}

describe('routingEngine', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('returns a route object for supported destination type', async () => {
    const { requestRoute } = await loadRoutingEngine();
    const routePromise = requestRoute('fan-1', 'food');

    vi.advanceTimersByTime(TEST_BATCH_MS);
    const result = await routePromise;

    expect(result).toEqual(
      expect.objectContaining({
        destination: 'S1',
        path: ['B4', 'S1'],
      })
    );
  });

  it('returns null for unknown destination type', async () => {
    const { requestRoute } = await loadRoutingEngine();
    const routePromise = requestRoute('fan-1', 'merch');

    vi.advanceTimersByTime(TEST_BATCH_MS);
    await expect(routePromise).resolves.toBeNull();
  });

  it('batches multiple requests and updates nash stats', async () => {
    const { requestRoute, getNashStats, bumpNashRoutingEpoch } = await loadRoutingEngine();
    const p1 = requestRoute('fan-1', 'food');
    const p2 = requestRoute('fan-2', 'exit');

    vi.advanceTimersByTime(TEST_BATCH_MS);
    const [r1, r2] = await Promise.all([p1, p2]);

    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    expect(bumpNashRoutingEpoch).toHaveBeenCalledTimes(1);

    const stats = getNashStats();
    expect(stats.totalRoutes).toBe(2);
    expect(stats.lastBatchSize).toBe(2);
    expect(stats.nashRerouteCount).toBeGreaterThan(0);
  });

  it('does not resolve before batch timer elapses', async () => {
    const { requestRoute } = await loadRoutingEngine();
    let resolved = false;
    const promise = requestRoute('fan-1', 'food').then(() => {
      resolved = true;
    });

    vi.advanceTimersByTime(TEST_BATCH_MS - 1);
    await Promise.resolve();
    expect(resolved).toBe(false);

    vi.advanceTimersByTime(1);
    await promise;
    expect(resolved).toBe(true);
  });
});
