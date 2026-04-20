import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { HomePage } from '../../../features/home/HomePage';
import { useAuth } from '../../../auth/useAuth';
import { useHomePageState } from '../../../features/home/useHomePageState';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock('../../../components/ui/BottomNav', () => ({
  BottomNav: () => <div>BottomNav</div>,
}));

vi.mock('../../../auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../features/home/useHomePageState', () => ({
  useHomePageState: vi.fn(),
}));

describe('HomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({ signOut: vi.fn() });
    vi.mocked(useHomePageState).mockReturnValue({
      nearestFood: { id: 'S12', waitTime: 2 },
      comfortScore: 82,
      comfortColor: '#10B981',
      predictionText: 'Section B4 - looking good for 15 min',
      isEgress: false,
      fallbackAction: {
        type: 'food',
        title: 'Grab food now - ideal window',
        subtitle: 'Route avoids halftime rush',
        bg: 'from-emerald-600/10 to-teal-500/10',
        border: 'border-emerald-200',
        titleColor: 'text-emerald-900',
        subtitleColor: 'text-emerald-700',
        iconBg: 'bg-emerald-100',
        iconColor: 'text-emerald-600',
      },
      routing: false,
      aiRecommendation: null,
      handleRouteRequest: vi.fn(),
      crowdLevel: 37,
      activeRouteCount: 5,
      promoWalkMeters: 112,
      timeLeft: 125,
    });
  });

  it('renders core home widgets with mocked state', () => {
    render(<HomePage />);

    expect(screen.getByText('FlowState')).toBeInTheDocument();
    expect(screen.getByText('Your section comfort score')).toBeInTheDocument();
    expect(screen.getByText('Grab food now - ideal window')).toBeInTheDocument();
    expect(screen.getByText('BottomNav')).toBeInTheDocument();
  });

  it('calls signOut when header sign out is clicked', () => {
    const signOut = vi.fn();
    vi.mocked(useAuth).mockReturnValue({ signOut });

    render(<HomePage />);
    fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));

    expect(signOut).toHaveBeenCalledTimes(1);
  });

  it('navigates to map from quick nav', () => {
    render(<HomePage />);

    fireEvent.click(screen.getByRole('button', { name: 'Map' }));
    expect(mockNavigate).toHaveBeenCalledWith('/map');
  });
});
