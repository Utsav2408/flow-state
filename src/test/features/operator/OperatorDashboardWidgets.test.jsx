import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  AlertFeed,
  EventBtn,
  FanAppPreview,
  MetricCard,
  OperatorToast,
  SpeedBtn,
} from '../../../features/operator/OperatorDashboardWidgets';

vi.mock('../../../intelligence/comfortScoring', () => ({
  getComfortColor: () => '#10B981',
}));

vi.mock('../../../features/operator/operatorMetrics', () => ({
  formatTimeAgo: () => '10s ago',
}));

describe('OperatorDashboardWidgets', () => {
  it('renders operator toast visibility states', () => {
    const { rerender } = render(<OperatorToast message="Applied" visible />);
    expect(screen.getByText('Applied')).toBeInTheDocument();

    rerender(<OperatorToast message="Applied" visible={false} />);
    expect(screen.getByText('Applied')).toBeInTheDocument();
  });

  it('renders alert feed fallback and alerts', () => {
    const { rerender } = render(<AlertFeed alerts={[]} />);
    expect(screen.getByText('No alerts yet.')).toBeInTheDocument();

    rerender(<AlertFeed alerts={[{ severity: 'red', message: 'Hot zone', timestamp: Date.now() }]} />);
    expect(screen.getByText('Hot zone')).toBeInTheDocument();
    expect(screen.getByText('10s ago')).toBeInTheDocument();
  });

  it('renders metric, speed and event buttons with click handlers', () => {
    const onSpeed = vi.fn();
    const onEvent = vi.fn();

    render(
      <>
        <MetricCard label="Attendance" value="40,000" sub="100% cap" />
        <SpeedBtn label="5x" active={false} onClick={onSpeed} />
        <EventBtn id="evt" label="Final whistle" color="#EF4444" onClick={onEvent} selected pulse={false} />
      </>
    );

    expect(screen.getByText('Attendance')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '5x' }));
    fireEvent.click(screen.getByRole('button', { name: 'Final whistle' }));

    expect(onSpeed).toHaveBeenCalledTimes(1);
    expect(onEvent).toHaveBeenCalledTimes(1);
  });

  it('renders compact fan app preview stats', () => {
    render(
      <FanAppPreview
        comfortScore={78}
        nearestWait={3}
        crowdLevel={45}
        activeRouteCount={8}
        aiActionTitle="Route now"
        matchPhase="live_play"
      />
    );

    expect(screen.getByText('FlowState')).toBeInTheDocument();
    expect(screen.getByText('Comfort Score')).toBeInTheDocument();
    expect(screen.getByText('Route now')).toBeInTheDocument();
  });
});
