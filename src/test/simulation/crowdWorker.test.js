import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('crowdWorker message handler', () => {
  let intervalCallback = null;
  const postMessageSpy = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    intervalCallback = null;
    vi.stubGlobal('postMessage', postMessageSpy);
    vi.stubGlobal('setInterval', (cb) => {
      intervalCallback = cb;
      return 1;
    });
    vi.stubGlobal('clearInterval', vi.fn());
    vi.stubGlobal('setTimeout', vi.fn());
    vi.stubGlobal('self', {});
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('handles START/SET_SPEED/TRIGGER_EVENT/PAUSE commands', async () => {
    vi.doMock('../../models/venueLayout', () => ({
      ZONE_TARGETS: { B4: { x: 400, y: 300, capacity: 1000 } },
      STAND_LAYOUT: [{ id: 'S1', x: 500, y: 300 }],
      GATES_LAYOUT: [
        { id: 'G1', x: 100, y: 100 },
        { id: 'G2', x: 900, y: 100 },
      ],
      projectOutsideInnerGroundCircle: (x, y) => ({ x, y }),
    }));

    await import('../../simulation/crowdWorker');

    self.onmessage({ data: { type: 'START' } });
    expect(intervalCallback).toBeTypeOf('function');

    intervalCallback();
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'tick',
        payload: expect.objectContaining({
          stats: expect.objectContaining({ total: 40000 }),
        }),
      })
    );

    self.onmessage({ data: { type: 'SET_SPEED', payload: 5 } });
    self.onmessage({ data: { type: 'TRIGGER_EVENT', payload: 'goal' } });
    self.onmessage({ data: { type: 'PAUSE' } });
  });
});
