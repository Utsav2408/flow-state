import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RequireAuth } from '../../auth/RequireAuth';
import { useAuth } from '../../auth/useAuth';

vi.mock('../../auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

function LoginLocation() {
  const location = useLocation();
  return <div>LOGIN{location.search}</div>;
}

describe('RequireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading spinner while auth is loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route
            path="/private"
            element={
              <RequireAuth>
                <div>PRIVATE</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByText('PRIVATE')).not.toBeInTheDocument();
  });

  it('redirects unauthenticated users to login with encoded next path', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/private?tab=1']}>
        <Routes>
          <Route
            path="/private"
            element={
              <RequireAuth>
                <div>PRIVATE</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginLocation />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('LOGIN?next=%2Fprivate%3Ftab%3D1')).toBeInTheDocument();
  });

  it('redirects to login with root next path', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <RequireAuth>
                <div>PRIVATE</div>
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginLocation />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText('LOGIN?next=%2F')).toBeInTheDocument();
  });

  it('renders children when user is authenticated', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'u1' },
      loading: false,
    });

    render(
      <MemoryRouter initialEntries={['/private']}>
        <Routes>
          <Route
            path="/private"
            element={
              <RequireAuth>
                <div>PRIVATE</div>
              </RequireAuth>
            }
          />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText('PRIVATE')).toBeInTheDocument();
  });
});
