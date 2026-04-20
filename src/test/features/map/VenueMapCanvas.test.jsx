import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { VenueMapCanvas } from '../../../features/map/VenueMapCanvas';

const mockUseStore = vi.fn();

vi.mock('../../../store/useStore', () => ({
  useStore: (selector) => mockUseStore(selector),
}));

vi.mock('../../../utils/venueMapCanvasPaint', () => ({
  paintDensityHeatmapOffscreen: vi.fn(),
  paintVenueMainCanvas: vi.fn(),
}));

function createMock2dContext() {
  const noOp = () => {};
  return {
    scale: noOp,
    clearRect: noOp,
    save: noOp,
    restore: noOp,
    translate: noOp,
  };
}

describe('VenueMapCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockUseStore.mockImplementation((selector) =>
      selector({
        zones: new Map([['B4', { density: 40 }]]),
        stands: new Map([['S12', { waitTime: 3 }]]),
        activeRoute: null,
        groupMembers: [{ id: 'You', x: 100, y: 100 }],
      }),
    );

    vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 0));
    vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });

    Object.defineProperty(HTMLElement.prototype, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        width: 500,
        height: 300,
        left: 0,
        top: 0,
        right: 500,
        bottom: 300,
      }),
    });

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => createMock2dContext(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('provides an accessible interactive canvas with keyboard controls', () => {
    render(
      <VenueMapCanvas
        filters={{ density: true, food: true, restrooms: true, exits: true, group: true }}
      />,
    );

    const mapCanvas = screen.getByRole('img', { name: 'Fan venue map' });
    fireEvent.keyDown(mapCanvas, { key: 'ArrowLeft' });
    fireEvent.keyDown(mapCanvas, { key: '+' });
    fireEvent.keyDown(mapCanvas, { key: '0' });

    expect(mapCanvas).toHaveAttribute('tabindex', '0');
    expect(screen.getByText(/Interactive map. Use arrow keys to pan/i)).toBeInTheDocument();
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(
      <VenueMapCanvas
        filters={{ density: true, food: true, restrooms: true, exits: true, group: true }}
      />,
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
