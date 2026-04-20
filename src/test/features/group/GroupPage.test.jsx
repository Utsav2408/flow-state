import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { GroupPage } from '../../../features/group/GroupPage';

const mockNavigate = vi.fn();
const mockUseStore = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../store/useStore', () => ({
  useStore: (selector) => mockUseStore(selector),
}));

vi.mock('../../../features/map/VenueMapCanvas', () => ({
  VenueMapCanvas: () => <div>VenueMapCanvas</div>,
}));

vi.mock('../../../components/ui/BottomNav', () => ({
  BottomNav: () => <div>BottomNav</div>,
}));

vi.mock('../../../components/ui/Toast', () => ({
  Toast: ({ message }) => <div>{message}</div>,
}));

describe('GroupPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    mockUseStore.mockImplementation((selector) =>
      selector({
        stands: new Map([
          ['S12', { waitTime: 4, x: 200, y: 100 }],
          ['S15', { waitTime: 8, x: 400, y: 200 }],
        ]),
        groupMembers: [
          { x: 100, y: 100 },
          { x: 120, y: 90 },
          { x: 150, y: 140 },
          { x: 130, y: 115 },
        ],
      })
    );
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders smart meetup and member list sections', () => {
    render(<GroupPage />);

    expect(screen.getByText('My group')).toBeInTheDocument();
    expect(screen.getByText('Smart Meetup Suggestion')).toBeInTheDocument();
    expect(screen.getByText('4 MEMBERS')).toBeInTheDocument();
    expect(screen.getByText('VenueMapCanvas')).toBeInTheDocument();
  });

  it('shows sent state and toast after pinging the group', () => {
    render(<GroupPage />);

    fireEvent.click(screen.getByRole('button', { name: 'Ping everyone to meet here' }));
    expect(screen.getByText('Sent!')).toBeInTheDocument();
    expect(screen.getByText('Meetup request sent to 3 members!')).toBeInTheDocument();
  });

  it('navigates to map after sync food run', () => {
    render(<GroupPage />);

    fireEvent.click(screen.getByRole('button', { name: /Sync food run/i }));
    vi.advanceTimersByTime(1500);

    expect(mockNavigate).toHaveBeenCalledWith('/map');
  });
});
