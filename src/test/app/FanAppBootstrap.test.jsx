import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';
import { FanAppBootstrap } from '../../app/FanAppBootstrap';

const mockUseStore = vi.fn();

vi.mock('../../store/useStore', () => ({
  useStore: (selector) => mockUseStore(selector),
}));

describe('FanAppBootstrap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes data once and unsubscribes on unmount', async () => {
    const unsub = vi.fn();
    const initMockData = vi.fn().mockResolvedValue(undefined);
    const subscribeToData = vi.fn(() => unsub);

    mockUseStore.mockImplementation((selector) =>
      selector({
        initMockData,
        subscribeToData,
      })
    );

    const { unmount } = render(
      <FanAppBootstrap>
        <div>child</div>
      </FanAppBootstrap>
    );

    await Promise.resolve();
    await Promise.resolve();

    expect(initMockData).toHaveBeenCalledTimes(1);
    expect(subscribeToData).toHaveBeenCalledTimes(1);

    unmount();
    expect(unsub).toHaveBeenCalledTimes(1);
  });
});
