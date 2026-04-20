import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OperatorPage } from '../../../features/operator/OperatorPage';
import { useOperatorDashboardState } from '../../../features/operator/useOperatorDashboardState';

vi.mock('../../../components/ui/BottomNav', () => ({
  BottomNav: () => <div>BottomNav</div>,
}));

vi.mock('../../../features/operator/OperatorDashboardWidgets', () => ({
  OperatorToast: ({ message, visible }) => (visible ? <div>{message}</div> : null),
}));

vi.mock('../../../features/operator/OperatorDashboardPanels', () => ({
  OperatorDashboardHeader: ({ simTimeSecs, matchLabel }) => (
    <div>{`Header ${matchLabel} @ ${simTimeSecs}`}</div>
  ),
  OperatorDashboardLeftColumn: ({ fanCount, activeRoutes }) => (
    <div>{`Left ${fanCount} fans / ${activeRoutes} routes`}</div>
  ),
  OperatorDashboardRightColumn: ({ aiActionTitle }) => <div>{`Right ${aiActionTitle}`}</div>,
}));

vi.mock('../../../features/operator/useOperatorDashboardState', () => ({
  useOperatorDashboardState: vi.fn(),
}));

describe('OperatorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOperatorDashboardState).mockReturnValue({
      zones: new Map(),
      stands: new Map(),
      simTimeSecs: 300,
      matchLabel: 'IN PLAY',
      matchColor: 'green',
      fanCount: 1234,
      capPct: 65,
      avgWait: 5,
      waitDelta: -1,
      waitDeltaLabel: 'down',
      activeRoutes: 44,
      departedPct: 12,
      matchPhase: 'in_match',
      comfortScore: 72,
      comfortDelta: 2,
      comfortDeltaLabel: 'up',
      allAlerts: [],
      nearestWait: 2,
      crowdLevel: 42,
      fanActiveRoutes: 9,
      aiActionTitle: 'Hold ingress',
      speed: 1,
      updateSimSpeed: vi.fn(),
      activeTriggerEvent: null,
      pulsingTriggerEvent: null,
      lastTriggerMeta: null,
      clearActiveTrigger: vi.fn(),
      handleTriggerEvent: vi.fn(),
      toast: { message: 'Action applied', visible: true },
    });
  });

  it('renders dashboard sections and toast from state', () => {
    render(<OperatorPage />);

    expect(screen.getByText('Header IN PLAY @ 300')).toBeInTheDocument();
    expect(screen.getByText('Left 1234 fans / 44 routes')).toBeInTheDocument();
    expect(screen.getByText('Right Hold ingress')).toBeInTheDocument();
    expect(screen.getByText('Action applied')).toBeInTheDocument();
    expect(screen.getByText('BottomNav')).toBeInTheDocument();
  });
});
