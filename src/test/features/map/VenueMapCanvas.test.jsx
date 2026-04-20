import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { VenueMapCanvas } from '../../../features/map/VenueMapCanvas';
import { paintDensityHeatmapOffscreen, paintVenueMainCanvas } from '../../../utils/venueMapCanvasPaint';

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

  it('renders route badge and supports pointer + wheel interactions', () => {
    mockUseStore.mockImplementation((selector) =>
      selector({
        zones: new Map([['B4', { density: 40 }]]),
        stands: new Map([['S12', { waitTime: 3 }]]),
        activeRoute: { destination: 'S12', nashRerouteCount: 123, navMode: 'fan' },
        groupMembers: [
          { id: 'You', x: 100, y: 100, zone: 'B4' },
          { id: 'AK', x: 120, y: 120, zone: 'B4', color: '#F43F5E' },
        ],
      }),
    );

    render(
      <VenueMapCanvas
        filters={{ density: true, food: true, restrooms: true, exits: true, group: true, route: true }}
        wheelZoomRequiresModifier
      />,
    );

    const mapCanvas = screen.getByRole('img', { name: 'Fan venue map' });

    fireEvent.pointerDown(mapCanvas, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(mapCanvas, { pointerId: 1, clientX: 120, clientY: 120 });
    fireEvent.pointerUp(mapCanvas, { pointerId: 1 });

    fireEvent.wheel(mapCanvas, { deltaY: -120, ctrlKey: true });
    fireEvent.wheel(mapCanvas, { deltaY: 120, ctrlKey: true });

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));

    expect(screen.getByText(/Smart route: 123 others rerouted/i)).toBeInTheDocument();
  });

  it('handles disabled interaction mode and hidden route badge', () => {
    mockUseStore.mockImplementation((selector) =>
      selector({
        zones: new Map([['B4', { density: 40 }]]),
        stands: new Map([['S12', { waitTime: 3 }]]),
        activeRoute: { destination: 'S12', nashRerouteCount: 123, navMode: 'fan' },
        groupMembers: [{ id: 'You', x: 100, y: 100, zone: 'B4' }],
      }),
    );

    render(
      <VenueMapCanvas
        filters={{ density: false, food: true, restrooms: true, exits: true, group: false, route: false }}
        disableInteraction
        showMeetupCentroid
        customMeetupPoint={{ x: 200, y: 200 }}
        hideRouteBadge
      />,
    );

    const mapCanvas = screen.getByRole('img', { name: 'Fan venue map' });
    expect(mapCanvas).toHaveAttribute('tabindex', '-1');
    expect(screen.queryByText(/Smart route:/i)).not.toBeInTheDocument();
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

  it('invokes paint helpers during render cycles', () => {
    render(
      <VenueMapCanvas
        filters={{ density: true, food: true, restrooms: true, exits: true, group: true, route: true }}
      />,
    );

    expect(paintDensityHeatmapOffscreen).toHaveBeenCalled();
    expect(paintVenueMainCanvas).toHaveBeenCalled();
  });
});
