import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '../../store/useStore';

const mockOnValue = vi.fn();
const mockRef = vi.fn((_db, path) => path);
const mockPopulateInitialData = vi.fn().mockResolvedValue(undefined);

vi.mock('../../firebase', () => ({
  db: { key: 'db' },
  ref: (...args) => mockRef(...args),
  onValue: (...args) => mockOnValue(...args),
  populateInitialData: () => mockPopulateInitialData(),
}));

vi.mock('../../models/venueLayout', () => ({
  projectOutsideInnerGroundCircle: (x, y) => ({ x, y }),
}));

describe('useStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useStore.setState({
      simState: {
        clock: '19:30',
        speed: 1,
        state: 'MATCH_IN_PROGRESS',
        simTimeSecs: 0,
        postMatchElapsedSecs: 0,
        halftimeCountdownSeconds: 480,
      },
      zones: new Map(),
      stands: new Map(),
      currentFan: { location: 'B4-B6', id: 'fan-1' },
      alerts: [],
      activeRoute: null,
      nashRoutingEpoch: 0,
    });
  });

  it('updates state via core actions', () => {
    useStore.getState().setSimState({ speed: 5 });
    expect(useStore.getState().simState.speed).toBe(5);

    useStore.getState().updateZones(new Map([['B4', { density: 50 }]]));
    expect(useStore.getState().zones.get('B4').density).toBe(50);

    useStore.getState().updateStands(new Map([['S12', { waitTime: 3 }]]));
    expect(useStore.getState().stands.get('S12').waitTime).toBe(3);

    useStore.getState().setActiveRoute({ destination: 'S12' });
    expect(useStore.getState().activeRoute.destination).toBe('S12');
    useStore.getState().clearActiveRoute();
    expect(useStore.getState().activeRoute).toBeNull();

    useStore.getState().bumpNashRoutingEpoch();
    expect(useStore.getState().nashRoutingEpoch).toBe(1);
  });

  it('subscribes to RTDB data and applies snapshot updates', () => {
    const listeners = {};
    const unsubs = [vi.fn(), vi.fn(), vi.fn(), vi.fn()];
    mockOnValue.mockImplementation((path, cb) => {
      listeners[path] = cb;
      return unsubs.shift();
    });

    const unsubscribe = useStore.getState().subscribeToData();

    listeners.simulation({ val: () => ({ speed: 9, state: 'post_match' }) });
    listeners.zones({ val: () => ({ B4: { density: 70 } }) });
    listeners.stands({ val: () => ({ S12: { waitTime: 4 } }) });
    listeners.alerts({ val: () => ({ a: { message: 'alert', severity: 'high' } }) });

    const state = useStore.getState();
    expect(state.simState.speed).toBe(9);
    expect(state.zones.get('B4').density).toBe(70);
    expect(state.stands.get('S12').waitTime).toBe(4);
    expect(state.alerts).toHaveLength(1);

    unsubscribe();
    expect(mockOnValue).toHaveBeenCalledTimes(4);
  });

  it('subscribes to alerts only via subscribeToAlerts', () => {
    const unsub = vi.fn();
    mockOnValue.mockImplementation((_path, cb) => {
      cb({ val: () => [{ message: 'alert', severity: 'low' }] });
      return unsub;
    });

    const stop = useStore.getState().subscribeToAlerts();
    expect(useStore.getState().alerts).toHaveLength(1);
    stop();
    expect(unsub).toHaveBeenCalledTimes(1);
  });
});
