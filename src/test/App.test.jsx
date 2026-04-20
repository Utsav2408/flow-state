import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

vi.mock('../auth/LoginPage', () => ({
  LoginPage: () => <div>LOGIN_PAGE</div>,
}));

vi.mock('../auth/ProtectedOperator', () => ({
  ProtectedOperator: () => <div>PROTECTED_OPERATOR</div>,
}));

vi.mock('../auth/RequireAuth', () => ({
  RequireAuth: ({ children }) => <>{children}</>,
}));

vi.mock('../app/FanAppBootstrap', () => ({
  FanAppBootstrap: ({ children }) => <>{children}</>,
}));

vi.mock('../features/egress/EgressTransitionGate', () => ({
  EgressTransitionGate: () => <div>EGRESS_GATE</div>,
}));

vi.mock('../features/home/HomePage', () => ({
  HomePage: () => <div>HOME_PAGE</div>,
}));

vi.mock('../features/map/MapPage', () => ({
  MapPage: () => <div>MAP_PAGE</div>,
}));

vi.mock('../features/group/GroupPage', () => ({
  GroupPage: () => <div>GROUP_PAGE</div>,
}));

vi.mock('../features/rewards/RewardsPage', () => ({
  RewardsPage: () => <div>REWARDS_PAGE</div>,
}));

vi.mock('../features/egress/EgressPage', () => ({
  EgressPage: () => <div>EGRESS_PAGE</div>,
}));

describe('App routes', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/');
  });

  it('renders login route at /login', () => {
    window.history.pushState({}, '', '/login');
    render(<App />);
    expect(screen.getByText('LOGIN_PAGE')).toBeInTheDocument();
  });

  it('renders operator route at /operator', () => {
    window.history.pushState({}, '', '/operator');
    render(<App />);
    expect(screen.getByText('PROTECTED_OPERATOR')).toBeInTheDocument();
  });

  it('renders fan shell pages and redirects unknown routes to home', () => {
    window.history.pushState({}, '', '/map');
    const { unmount } = render(<App />);
    expect(screen.getByText('MAP_PAGE')).toBeInTheDocument();
    expect(screen.getByText('EGRESS_GATE')).toBeInTheDocument();
    unmount();

    window.history.pushState({}, '', '/profile');
    render(<App />);
    expect(screen.getByText('HOME_PAGE')).toBeInTheDocument();
  });
});
