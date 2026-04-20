import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import {
  FanAppPreviewSection,
  OperatorPanelDivider,
  SimulationSpeedSection,
  TriggerEventsSection,
  ZoneStatusSection,
} from '../../../features/operator/OperatorRightRailSections';

vi.mock('../../../features/operator/OperatorDashboardWidgets', () => ({
  EventBtn: ({ label, onClick }) => <button onClick={onClick}>{label}</button>,
  FanAppPreview: () => <div>FAN_PREVIEW</div>,
  SpeedBtn: ({ label, onClick }) => <button onClick={onClick}>{label}</button>,
}));

vi.mock('../../../features/operator/operatorMetrics', () => ({
  formatWallClock: () => '7:30:00 PM',
}));

describe('OperatorRightRailSections', () => {
  it('renders preview + divider', () => {
    render(
      <>
        <OperatorPanelDivider />
        <FanAppPreviewSection
          comfortScore={80}
          nearestWait={2}
          crowdLevel={30}
          fanActiveRoutes={12}
          aiActionTitle="Route"
          matchPhase="live_play"
        />
      </>
    );
    expect(screen.getByText('Fan App Preview')).toBeInTheDocument();
    expect(screen.getByText('FAN_PREVIEW')).toBeInTheDocument();
  });

  it('switches simulation speed buttons', () => {
    const updateSimSpeed = vi.fn();
    render(<SimulationSpeedSection speed={5} updateSimSpeed={updateSimSpeed} />);

    fireEvent.click(screen.getByRole('button', { name: '1x' }));
    fireEvent.click(screen.getByRole('button', { name: '20x' }));

    expect(updateSimSpeed).toHaveBeenCalledWith(1);
    expect(updateSimSpeed).toHaveBeenCalledWith(20);
  });

  it('handles trigger events and deselect action', () => {
    const handleTriggerEvent = vi.fn();
    const onClearActiveTrigger = vi.fn();

    render(
      <TriggerEventsSection
        activeTriggerEvent="goal"
        pulsingTriggerEvent={null}
        lastTriggerMeta={{ event: 'goal', at: Date.now() }}
        onClearActiveTrigger={onClearActiveTrigger}
        handleTriggerEvent={handleTriggerEvent}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Halftime break' }));
    fireEvent.click(screen.getByRole('button', { name: 'Deselect' }));

    expect(handleTriggerEvent).toHaveBeenCalledWith('halftime');
    expect(onClearActiveTrigger).toHaveBeenCalledTimes(1);
    expect(screen.getByText('7:30:00 PM')).toBeInTheDocument();
  });

  it('renders zone density bars from grouped aliases', () => {
    const zones = new Map([
      ['A1', { density: 20 }],
      ['A2', { density: 30 }],
      ['A3', { density: 40 }],
      ['A4', { density: 50 }],
      ['B1', { density: 60 }],
      ['B2', { density: 70 }],
      ['B3', { density: 80 }],
      ['B4', { density: 40 }],
      ['B5', { density: 45 }],
      ['B6', { density: 50 }],
      ['C1', { density: 55 }],
      ['C2', { density: 60 }],
      ['C3', { density: 65 }],
      ['C4', { density: 70 }],
      ['C5', { density: 75 }],
      ['C6', { density: 80 }],
      ['D1', { density: 35 }],
      ['D2', { density: 30 }],
      ['D3', { density: 25 }],
    ]);
    render(<ZoneStatusSection zones={zones} />);
    expect(screen.getByText('A1-A4')).toBeInTheDocument();
    expect(screen.getByText('B1-B3')).toBeInTheDocument();
  });
});
