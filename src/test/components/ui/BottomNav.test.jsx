import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { BottomNav } from '../../../components/ui/BottomNav';

const mockUseStore = vi.fn();

vi.mock('../../../auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../../store/useStore', () => ({
  useStore: (selector) => mockUseStore(selector),
}));

import { useAuth } from '../../../auth/useAuth';

describe('BottomNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      isAdmin: false,
      loading: false,
    });
    mockUseStore.mockImplementation((selector) =>
      selector({
        simState: { state: 'in_match' },
      })
    );
  });

  it('shows Rewards tab during non-egress phases', () => {
    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.getByText('Rewards')).toBeInTheDocument();
    expect(screen.queryByText('Egress')).not.toBeInTheDocument();
  });

  it('shows Egress tab in post-match and admin Operator tab when allowed', () => {
    vi.mocked(useAuth).mockReturnValue({
      isAdmin: true,
      loading: false,
    });
    mockUseStore.mockImplementation((selector) =>
      selector({
        simState: { state: 'post_match' },
      })
    );

    render(
      <MemoryRouter>
        <BottomNav />
      </MemoryRouter>
    );

    expect(screen.getByText('Egress')).toBeInTheDocument();
    expect(screen.queryByText('Rewards')).not.toBeInTheDocument();
    expect(screen.getByText('Operator')).toBeInTheDocument();
  });
});
