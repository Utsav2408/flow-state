import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { RewardsPage } from '../../../features/rewards/RewardsPage';

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

describe('RewardsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders active offers and recent activity', () => {
    render(<RewardsPage />);

    expect(screen.getByText('Rewards')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE OFFERS NEAR YOU')).toBeInTheDocument();
    expect(screen.getByText('RECENT ACTIVITY')).toBeInTheDocument();
    expect(screen.getByText('BottomNav')).toBeInTheDocument();
  });

  it('navigates back when header back is clicked', () => {
    render(<RewardsPage />);

    fireEvent.click(screen.getAllByRole('button')[0]);
    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
