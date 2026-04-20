import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import {
  OperatorDashboardHeader,
  OperatorDashboardLeftColumn,
  OperatorDashboardRightColumn,
} from '../../../features/operator/OperatorDashboardPanels';

vi.mock('../../../features/operator/OperatorMapCanvas', () => ({
  OperatorMapCanvas: () => <div>OP_MAP_CANVAS</div>,
}));

vi.mock('../../../features/operator/OperatorDashboardWidgets', () => ({
  MetricCard: ({ label }) => <div>{`Metric:${label}`}</div>,
  AlertFeed: ({ alerts }) => <div>{`Alerts:${alerts.length}`}</div>,
  FlowStateLogo: () => <div>FLOWSTATE_LOGO</div>,
}));

vi.mock('../../../features/operator/OperatorRightRailSections', () => ({
  FanAppPreviewSection: () => <div>FAN_PREVIEW_SECTION</div>,
  OperatorPanelDivider: () => <div>DIVIDER</div>,
  SimulationSpeedSection: () => <div>SPEED_SECTION</div>,
  TriggerEventsSection: () => <div>TRIGGER_SECTION</div>,
  ZoneStatusSection: () => <div>ZONE_STATUS_SECTION</div>,
}));

vi.mock('../../../features/operator/operatorMetrics', () => ({
  formatSimTime: (secs) => `T${Math.round(secs)}`,
}));

describe('OperatorDashboardPanels', () => {
  it('renders header with formatted time and match state', () => {
    render(<OperatorDashboardHeader simTimeSecs={12.4} matchLabel="LIVE" matchColor="#22C55E" />);

    expect(screen.getByText('FLOWSTATE_LOGO')).toBeInTheDocument();
    expect(screen.getByText('T12')).toBeInTheDocument();
    expect(screen.getAllByText('LIVE').length).toBeGreaterThan(0);
  });

  it('renders left column sections and metrics', () => {
    render(
      <OperatorDashboardLeftColumn
        fanCount={1000}
        capPct={50}
        avgWait={3}
        waitDelta={-1}
        waitDeltaLabel="-1m"
        activeRoutes={40}
        departedPct={5}
        matchPhase="live_play"
        comfortScore={70}
        comfortDelta={2}
        comfortDeltaLabel="+2"
        zones={new Map()}
        stands={new Map()}
        allAlerts={[{ message: 'a' }]}
      />
    );

    expect(screen.getByText('Metric:Attendance')).toBeInTheDocument();
    expect(screen.getByText('Metric:Avg Wait')).toBeInTheDocument();
    expect(screen.getByText('Metric:Active Routes')).toBeInTheDocument();
    expect(screen.getByText('OP_MAP_CANVAS')).toBeInTheDocument();
    expect(screen.getByText('Alerts:1')).toBeInTheDocument();
  });

  it('renders right column rail sections', () => {
    render(
      <OperatorDashboardRightColumn
        simTimeSecs={90}
        matchLabel="HALFTIME"
        matchColor="#F59E0B"
        comfortScore={65}
        nearestWait={4}
        crowdLevel={44}
        fanActiveRoutes={22}
        aiActionTitle="Hold"
        speed={5}
        updateSimSpeed={vi.fn()}
        activeTriggerEvent={null}
        pulsingTriggerEvent={null}
        lastTriggerMeta={null}
        onClearActiveTrigger={vi.fn()}
        handleTriggerEvent={vi.fn()}
        zones={new Map()}
        matchPhase="halftime"
      />
    );

    expect(screen.getByText('FAN_PREVIEW_SECTION')).toBeInTheDocument();
    expect(screen.getByText('SPEED_SECTION')).toBeInTheDocument();
    expect(screen.getByText('TRIGGER_SECTION')).toBeInTheDocument();
    expect(screen.getByText('ZONE_STATUS_SECTION')).toBeInTheDocument();
  });
});
