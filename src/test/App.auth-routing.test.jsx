import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import App from '../App';
import { useAuth } from '../auth/useAuth';

vi.mock('../auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../features/operator/OperatorPage', () => ({
  OperatorPage: () => <div>OPERATOR_PAGE_REAL_ROUTE</div>,
}));

describe('App auth routing integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects /operator to /login with next when anonymous', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
      firebaseConfigured: true,
      signInGoogle: vi.fn(),
      signInEmail: vi.fn(),
      signUpEmail: vi.fn(),
      signOut: vi.fn(),
    });

    window.history.pushState({}, '', '/operator');
    render(<App />);

    await waitFor(() => {
      expect(window.location.pathname).toBe('/login');
      expect(window.location.search).toContain('next=%2Foperator');
    });
    expect(screen.getByText('Sign in to FlowState')).toBeInTheDocument();
  });

  it('navigates admin from /login?next=/operator into protected operator page', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'admin-1' },
      isAdmin: true,
      loading: false,
      firebaseConfigured: true,
      signInGoogle: vi.fn(),
      signInEmail: vi.fn(),
      signUpEmail: vi.fn(),
      signOut: vi.fn(),
    });

    window.history.pushState({}, '', '/login?next=%2Foperator');
    render(<App />);

    expect(await screen.findByText('OPERATOR_PAGE_REAL_ROUTE')).toBeInTheDocument();
    expect(window.location.pathname).toBe('/operator');
  });
});
