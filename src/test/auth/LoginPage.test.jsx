import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { LoginPage } from '../../auth/LoginPage';
import { useAuth } from '../../auth/useAuth';

vi.mock('../../auth/useAuth', () => ({
  useAuth: vi.fn(),
}));

function MapLocation() {
  const location = useLocation();
  return <div>MAP{location.search}</div>;
}

function renderLogin(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>HOME</div>} />
        <Route path="/operator" element={<div>OPERATOR</div>} />
        <Route path="/map" element={<MapLocation />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows a spinner while loading', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      loading: true,
      firebaseConfigured: true,
      signInGoogle: vi.fn(),
      signInEmail: vi.fn(),
      signUpEmail: vi.fn(),
    });

    renderLogin();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('shows setup instructions when Firebase is not configured', () => {
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
      firebaseConfigured: false,
      signInGoogle: vi.fn(),
      signInEmail: vi.fn(),
      signUpEmail: vi.fn(),
    });

    renderLogin();
    expect(screen.getByText('Firebase not configured')).toBeInTheDocument();
  });

  it('redirects non-admin users away from /operator next target', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'u1' },
      isAdmin: false,
      loading: false,
      firebaseConfigured: true,
      signInGoogle: vi.fn(),
      signInEmail: vi.fn(),
      signUpEmail: vi.fn(),
    });

    renderLogin('/login?next=%2Foperator');
    expect(await screen.findByText('HOME')).toBeInTheDocument();
  });

  it('rejects malformed external next target and redirects home', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'u1' },
      isAdmin: true,
      loading: false,
      firebaseConfigured: true,
      signInGoogle: vi.fn(),
      signInEmail: vi.fn(),
      signUpEmail: vi.fn(),
    });

    renderLogin('/login?next=%2F%2Fevil.example');
    expect(await screen.findByText('HOME')).toBeInTheDocument();
  });

  it('redirects admin users to safe next path including querystring', async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { uid: 'u1' },
      isAdmin: true,
      loading: false,
      firebaseConfigured: true,
      signInGoogle: vi.fn(),
      signInEmail: vi.fn(),
      signUpEmail: vi.fn(),
    });

    renderLogin('/login?next=%2Fmap%3Ffrom%3Dlogin');
    expect(await screen.findByText('MAP?from=login')).toBeInTheDocument();
  });

  it('submits email sign-in flow', async () => {
    const user = userEvent.setup();
    const signInEmail = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
      firebaseConfigured: true,
      signInGoogle: vi.fn(),
      signInEmail,
      signUpEmail: vi.fn(),
    });

    renderLogin();
    await user.type(screen.getByPlaceholderText('you@organization.com'), 'fan@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'hunter2');
    const submitButton = document.querySelector('button[type="submit"]');
    expect(submitButton).toBeInTheDocument();
    await user.click(submitButton);

    await waitFor(() => {
      expect(signInEmail).toHaveBeenCalledWith('fan@example.com', 'hunter2');
    });
  });

  it('shows email auth error when sign-in fails', async () => {
    const user = userEvent.setup();
    const signInEmail = vi.fn().mockRejectedValue(new Error('Invalid credentials'));

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
      firebaseConfigured: true,
      signInGoogle: vi.fn(),
      signInEmail,
      signUpEmail: vi.fn(),
    });

    renderLogin();
    await user.type(screen.getByPlaceholderText('you@organization.com'), 'fan@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpass');
    const submitButton = document.querySelector('button[type="submit"]');
    await user.click(submitButton);

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
  });

  it('submits email sign-up flow after mode switch', async () => {
    const user = userEvent.setup();
    const signUpEmail = vi.fn().mockResolvedValue(undefined);

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
      firebaseConfigured: true,
      signInGoogle: vi.fn(),
      signInEmail: vi.fn(),
      signUpEmail,
    });

    renderLogin();
    await user.click(screen.getByRole('button', { name: 'Create account' }));
    await user.type(screen.getByPlaceholderText('you@organization.com'), 'new@example.com');
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123');
    const createButtons = screen.getAllByRole('button', { name: 'Create account' });
    await user.click(createButtons[createButtons.length - 1]);

    await waitFor(() => {
      expect(signUpEmail).toHaveBeenCalledWith('new@example.com', 'password123');
    });
  });

  it('shows Google error message when sign in fails', async () => {
    const user = userEvent.setup();
    const signInGoogle = vi.fn().mockRejectedValue(new Error('Popup blocked'));

    vi.mocked(useAuth).mockReturnValue({
      user: null,
      isAdmin: false,
      loading: false,
      firebaseConfigured: true,
      signInGoogle,
      signInEmail: vi.fn(),
      signUpEmail: vi.fn(),
    });

    renderLogin();
    await user.click(screen.getByRole('button', { name: 'Continue with Google' }));

    expect(await screen.findByText('Popup blocked')).toBeInTheDocument();
  });
});
