import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MapPage } from '../../../features/map/MapPage';
import { useAuth } from '../../../auth/useAuth';
import { useMapRoutingState } from '../../../features/map/useMapRoutingState';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams('')],
  };
});

vi.mock('../../../auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../features/map/useMapRoutingState', () => ({
  useMapRoutingState: vi.fn(),
  formatEta: (seconds) => `${Math.floor(seconds / 60)}m ${String(seconds % 60).padStart(2, '0')}s`,
}));

vi.mock('../../../features/map/VenueMapCanvas', () => ({
  VenueMapCanvas: () => <div>VenueMapCanvas</div>,
}));

vi.mock('../../../components/ui/BottomNav', () => ({
  BottomNav: () => <div>BottomNav</div>,
}));

describe('MapPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ signOut: vi.fn() });
    vi.mocked(useMapRoutingState).mockReturnValue({
      filters: { density: true, food: true, restrooms: true, exits: true },
      toggleFilter: vi.fn(),
      routingBusy: false,
      quietestZone: { name: 'Zone B4', density: 28 },
      fastestFood: { name: 'S12', waitTime: 2 },
      navigationState: null,
      selectedRoute: null,
      isRouteSectionOpen: false,
      crowdTagByRoute: { A: 'low crowd' },
      turnByTurn: [],
      switchRoute: vi.fn(),
      cancelNavigation: vi.fn(),
      handleFastestFoodRoute: vi.fn(),
    });
  });

  it('renders overview map state and opens fastest food route action', () => {
    const handleFastestFoodRoute = vi.fn();
    vi.mocked(useMapRoutingState).mockReturnValue({
      filters: { density: true, food: true, restrooms: true, exits: true },
      toggleFilter: vi.fn(),
      routingBusy: false,
      quietestZone: { name: 'Zone B4', density: 28 },
      fastestFood: { name: 'S12', waitTime: 2 },
      navigationState: null,
      selectedRoute: null,
      isRouteSectionOpen: false,
      crowdTagByRoute: { A: 'low crowd' },
      turnByTurn: [],
      switchRoute: vi.fn(),
      cancelNavigation: vi.fn(),
      handleFastestFoodRoute,
    });

    render(<MapPage />);

    expect(screen.getByText('Live venue map')).toBeInTheDocument();
    expect(screen.getByText('VenueMapCanvas')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Fastest food route/i }));
    expect(handleFastestFoodRoute).toHaveBeenCalledTimes(1);
  });

  it('renders route guidance mode and switches route', () => {
    const switchRoute = vi.fn();
    const cancelNavigation = vi.fn();
    vi.mocked(useMapRoutingState).mockReturnValue({
      filters: { density: true, food: true, restrooms: true, exits: true },
      toggleFilter: vi.fn(),
      routingBusy: false,
      quietestZone: { name: 'Zone B4', density: 28 },
      fastestFood: { name: 'S12', waitTime: 2 },
      navigationState: {
        destinationLabel: 'Stand 12',
        selectedRouteId: 'A',
        nashRerouteCount: 100,
        routes: [
          { id: 'A', etaSeconds: 120 },
          { id: 'B', etaSeconds: 150 },
          { id: 'C', etaSeconds: 180 },
        ],
      },
      selectedRoute: { id: 'A', etaSeconds: 120 },
      isRouteSectionOpen: true,
      crowdTagByRoute: { A: 'low crowd', B: 'medium', C: 'empty' },
      turnByTurn: [{ title: 'Head south', subtitle: 'Past restroom block', time: '1m 10s' }],
      switchRoute,
      cancelNavigation,
      handleFastestFoodRoute: vi.fn(),
    });

    render(<MapPage />);

    expect(screen.getByText('Route guidance')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Route B/i }));
    expect(switchRoute).toHaveBeenCalledWith('B');

    fireEvent.click(screen.getByRole('button', { name: 'Back to overview map' }));
    expect(cancelNavigation).toHaveBeenCalledTimes(1);
  });
});
