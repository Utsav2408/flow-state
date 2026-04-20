import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { OperatorMapCanvas } from '../../../features/operator/OperatorMapCanvas';

const mockUseStore = vi.fn();

vi.mock('../../../store/useStore', () => ({
  useStore: (selector) => mockUseStore(selector),
}));

function createMock2dContext() {
  const noOp = () => {};
  return {
    scale: noOp,
    clearRect: noOp,
    translate: noOp,
    save: noOp,
    restore: noOp,
    beginPath: noOp,
    ellipse: noOp,
    fill: noOp,
    stroke: noOp,
    setLineDash: noOp,
    roundRect: noOp,
    fillText: noOp,
    arc: noOp,
    rect: noOp,
    clip: noOp,
    moveTo: noOp,
    lineTo: noOp,
    createRadialGradient: () => ({ addColorStop: noOp }),
    lineDashOffset: 0,
    textAlign: 'center',
    textBaseline: 'middle',
    globalAlpha: 1,
  };
}

describe('OperatorMapCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStore.mockImplementation((selector) =>
      selector({
        activeRoute: { path: ['B4', 'S12'], destination: 'S12' },
      })
    );

    vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 0));
    vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });

    Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
      configurable: true,
      value: () => createMock2dContext(),
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders canvas controls and handles zoom/reset interactions', () => {
    render(
      <OperatorMapCanvas
        zones={new Map([['B4', { density: 40 }]])}
        stands={new Map([['S12', { waitTime: 3 }]])}
        matchPhase="live_play"
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }));
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }));

    expect(screen.getByRole('button', { name: 'Zoom in' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zoom out' })).toBeInTheDocument();
  });

  it('supports keyboard pan and zoom interactions on the canvas', () => {
    render(
      <OperatorMapCanvas
        zones={new Map([['B4', { density: 40 }]])}
        stands={new Map([['S12', { waitTime: 3 }]])}
        matchPhase="live_play"
      />
    );

    const mapCanvas = screen.getByRole('img', { name: 'Operator venue heatmap map' });
    fireEvent.keyDown(mapCanvas, { key: 'ArrowRight' });
    fireEvent.keyDown(mapCanvas, { key: '+' });
    fireEvent.keyDown(mapCanvas, { key: '0' });

    expect(mapCanvas).toHaveAttribute('tabindex', '0');
  });

  it('has no obvious accessibility violations', async () => {
    const { container } = render(
      <OperatorMapCanvas
        zones={new Map([['B4', { density: 40 }]])}
        stands={new Map([['S12', { waitTime: 3 }]])}
        matchPhase="live_play"
      />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
