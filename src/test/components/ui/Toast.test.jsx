import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Toast } from '../../../components/ui/Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal('requestAnimationFrame', (cb) => setTimeout(cb, 0));
    vi.stubGlobal('cancelAnimationFrame', (id) => clearTimeout(id));
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('renders message and auto dismisses after duration', () => {
    const onDismiss = vi.fn();
    render(<Toast message="Saved!" onDismiss={onDismiss} durationMs={1000} />);

    expect(screen.getByRole('status')).toHaveTextContent('Saved!');

    vi.advanceTimersByTime(999);
    expect(onDismiss).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1 + 280);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('uses info styling variant when type is info', () => {
    render(<Toast message="Info update" type="info" onDismiss={vi.fn()} durationMs={5000} />);

    const el = screen.getByRole('status');
    expect(el.className).toContain('bg-blue-600');
  });
});
