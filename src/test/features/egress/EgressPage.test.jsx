import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { EgressPage } from '../../../features/egress/EgressPage';

const mockUseStore = vi.fn();
const mockGetEgressPlan = vi.fn();
const mockGetGroupGateAssignments = vi.fn();
const mockGetSimStats = vi.fn();
const mockGenerateEgressTip = vi.fn();

vi.mock('../../../store/useStore', () => ({
  useStore: (selector) => mockUseStore(selector),
}));

vi.mock('../../../components/ui/BottomNav', () => ({
  BottomNav: () => <div>BottomNav</div>,
}));

vi.mock('../../../components/ui/Toast', () => ({
  Toast: ({ message }) => <div>{message}</div>,
}));

vi.mock('../../../intelligence/egressChoreographer', () => ({
  getEgressPlan: (...args) => mockGetEgressPlan(...args),
  getGroupGateAssignments: () => mockGetGroupGateAssignments(),
}));

vi.mock('../../../models/venueLayout', () => ({
  GATE_BY_ID: {
    G3: { shortLabel: 'South' },
  },
}));

vi.mock('../../../simulation/crowdSimulator', () => ({
  getSimStats: () => mockGetSimStats(),
}));

vi.mock('../../../services/geminiService', () => ({
  generateEgressTip: (...args) => mockGenerateEgressTip(...args),
}));

describe('EgressPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseStore.mockImplementation((selector) =>
      selector({
        currentFan: { id: 'fan-1', location: 'B4-B6' },
        simState: { postMatchElapsedSecs: 20 },
      })
    );
    mockGetEgressPlan.mockReturnValue({ departureTime: 120, gate: 'G3' });
    mockGetGroupGateAssignments.mockReturnValue({
      You: 'G3',
      AK: 'G2',
      RS: 'G3',
      PV: 'G4',
    });
    mockGetSimStats.mockReturnValue({ exitedCount: 50, total: 100 });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders AI tip and allows claiming voucher', async () => {
    mockGenerateEgressTip.mockResolvedValue('Use Gate G3 now for fastest exit.');

    render(<EgressPage />);

    expect(screen.getByText('Match ended - RCB won!')).toBeInTheDocument();
    expect(await screen.findByText('Use Gate G3 now for fastest exit.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Claim' }));

    expect(screen.getByText('Claimed!')).toBeInTheDocument();
    expect(screen.getByText('Free coffee voucher added! Show this at Stand 5')).toBeInTheDocument();
    expect(screen.getByText('BottomNav')).toBeInTheDocument();
  });

  it('falls back to default tip and go-now message when departure time elapsed', async () => {
    mockUseStore.mockImplementation((selector) =>
      selector({
        currentFan: { id: 'fan-1', location: 'B4-B6' },
        simState: { postMatchElapsedSecs: 180 },
      })
    );
    mockGenerateEgressTip.mockRejectedValue(new Error('unavailable'));

    render(<EgressPage />);

    expect(screen.getByText('Go now! Head to G3')).toBeInTheDocument();
    expect(
      await screen.findByText('Your exit route through G3 is optimized for your group. Smart timing beats rushing.')
    ).toBeInTheDocument();
  });
});
