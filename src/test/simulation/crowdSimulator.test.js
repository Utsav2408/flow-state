import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockUpdate = vi.fn(() => Promise.resolve());
const mockRef = vi.fn(() => 'root-ref');
const mockSetSimState = vi.fn();
const mockUpdateZones = vi.fn();
const mockUpdateStands = vi.fn();
const mockSubscribe = vi.fn();

class MockWorker {
  static instances = [];

  constructor() {
    this.onmessage = null;
    this.postMessage = vi.fn();
    MockWorker.instances.push(this);
  }
}

vi.mock('../../store/useStore', () => ({
  useStore: {
    subscribe: (...args) => mockSubscribe(...args),
    getState: () => ({
      zones: new Map(),
      stands: new Map(),
      setSimState: mockSetSimState,
      updateZones: mockUpdateZones,
      updateStands: mockUpdateStands,
      simState: { speed: 1 },
    }),
  },
}));

vi.mock('../../firebase', () => ({
  db: { key: 'db' },
  ref: (...args) => mockRef(...args),
  update: (...args) => mockUpdate(...args),
}));

vi.mock('../../models/venueLayout', () => ({
  ZONE_TARGETS: {
    B4: { capacity: 1000 },
  },
  LOGICAL_MAP: { width: 1200, height: 800 },
  getDefaultStandCapacity: () => 300,
}));

describe('crowdSimulator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockWorker.instances = [];
    vi.stubGlobal('Worker', MockWorker);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('starts worker, handles tick updates, and proxies controls', async () => {
    const sim = await import('../../simulation/crowdSimulator');

    sim.startSimulation();
    const worker = MockWorker.instances[0];
    expect(worker).toBeTruthy();
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'START' });

    worker.onmessage({
      data: {
        type: 'tick',
        payload: {
          zoneCounts: { B4: 500 },
          standData: [{ id: 'S12', qLen: 20 }],
          stats: { phase: 'live_play', total: 40000 },
          simTimeSecs: 10,
          postMatchElapsedSecs: 0,
        },
      },
    });

    expect(mockSetSimState).toHaveBeenCalledWith(
      expect.objectContaining({
        state: 'live_play',
        simTimeSecs: 10,
      })
    );
    expect(mockUpdateZones).toHaveBeenCalledTimes(1);
    expect(mockUpdateStands).toHaveBeenCalledTimes(1);
    expect(sim.getSimTime()).toBe(10);
    expect(sim.getPostMatchElapsedTime()).toBe(0);
    expect(sim.getLogicalMapSize()).toEqual({ width: 1200, height: 800 });

    sim.setSimSpeed(5);
    sim.triggerEvent('goal');
    sim.pauseSimulation();
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'SET_SPEED', payload: 5 });
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'TRIGGER_EVENT', payload: 'goal' });
    expect(worker.postMessage).toHaveBeenCalledWith({ type: 'PAUSE' });
  });
});
