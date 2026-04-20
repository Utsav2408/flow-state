import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { ProtectedOperator } from '../../auth/ProtectedOperator';
import { useAuth } from '../../auth/useAuth';

vi.mock('../../auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

vi.mock('../../features/operator/OperatorPage', () => ({
  OperatorPage: () => <div>OPERATOR_PAGE</div>,
}));

function LoginLocation() {
  const location = useLocation();
  return <div>LOGIN{location.search}</div>;
}

describe('ProtectedOperator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a spinner while auth state is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      loading: true,
    });

    render(
      <MemoryRouter initialEntries={['/operator']}>
        <Routes>
          <Route path="/operator" element={<ProtectedOperator />} />
        </Routes>
      </MemoryRouter>
    );

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects anonymous users to login and preserves next', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/operator']}>
        <Routes>
          <Route path="/operator" element={<ProtectedOperator />} />
          <Route path="/login" element={<LoginLocation />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('LOGIN?next=%2Foperator')).toBeInTheDocument();
  });

  it('redirects non-admin users to home', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'u1' },
      isAdmin: false,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/operator']}>
        <Routes>
          <Route path="/operator" element={<ProtectedOperator />} />
          <Route path="/" element={<div>HOME</div>} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('HOME')).toBeInTheDocument();
  });

  it('renders operator page for admin users', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'u1' },
      isAdmin: true,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/operator']}>
        <Routes>
          <Route path="/operator" element={<ProtectedOperator />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('OPERATOR_PAGE')).toBeInTheDocument();
  });
});
