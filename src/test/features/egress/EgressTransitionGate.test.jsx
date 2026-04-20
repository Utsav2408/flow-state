import React from 'react';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EgressTransitionGate } from '../../../features/egress/EgressTransitionGate';

const mockNavigate = vi.fn();
const mockLocation = vi.fn();
const mockUseStore = vi.fn();

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useLocation: () => mockLocation(),
  };
});

vi.mock('../../../store/useStore', () => ({
  useStore: (selector) => mockUseStore(selector),
}));

describe('EgressTransitionGate', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows overlay and auto-navigates to /egress after 3s in post-match', () => {
    mockLocation.mockReturnValue({ pathname: '/map' });
    mockUseStore.mockImplementation((selector) =>
      selector({ simState: { state: 'post_match' } })
    );

    render(<EgressTransitionGate />);

    expect(screen.getByText('Match over!')).toBeInTheDocument();
    vi.advanceTimersByTime(3000);
    expect(mockNavigate).toHaveBeenCalledWith('/egress', { replace: true });
  });

  it('navigates immediately when user clicks "View exit plan"', () => {
    mockLocation.mockReturnValue({ pathname: '/group' });
    mockUseStore.mockImplementation((selector) =>
      selector({ simState: { state: 'post-match' } })
    );

    render(<EgressTransitionGate />);
    fireEvent.click(screen.getByRole('button', { name: 'View exit plan' }));

    expect(mockNavigate).toHaveBeenCalledWith('/egress');
  });

  it('does not render overlay when not in post-match state', () => {
    mockLocation.mockReturnValue({ pathname: '/map' });
    mockUseStore.mockImplementation((selector) =>
      selector({ simState: { state: 'MATCH_IN_PROGRESS' } })
    );

    const { container } = render(<EgressTransitionGate />);
    expect(container).toBeEmptyDOMElement();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('does not render overlay on /operator route', () => {
    mockLocation.mockReturnValue({ pathname: '/operator' });
    mockUseStore.mockImplementation((selector) =>
      selector({ simState: { state: 'post_match' } })
    );

    const { container } = render(<EgressTransitionGate />);
    expect(container).toBeEmptyDOMElement();
  });

  it('does not render overlay on /egress route', () => {
    mockLocation.mockReturnValue({ pathname: '/egress' });
    mockUseStore.mockImplementation((selector) =>
      selector({ simState: { state: 'post_match' } })
    );

    const { container } = render(<EgressTransitionGate />);
    expect(container).toBeEmptyDOMElement();
  });

  it('cleans up timer when component unmounts', () => {
    mockLocation.mockReturnValue({ pathname: '/map' });
    mockUseStore.mockImplementation((selector) =>
      selector({ simState: { state: 'post_match' } })
    );

    const { unmount } = render(<EgressTransitionGate />);
    unmount();
    vi.advanceTimersByTime(3000);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
