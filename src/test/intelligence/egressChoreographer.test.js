import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockGetShortestPath = vi.fn();
const mockGetNeighbors = vi.fn();

vi.mock('../../models/venueGraph', () => ({
  default: {
    getShortestPath: (...args) => mockGetShortestPath(...args),
    getNeighbors: (...args) => mockGetNeighbors(...args),
  },
}));

import { getEgressPlan, getGroupGateAssignments } from '../../intelligence/egressChoreographer';

describe('egressChoreographer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetShortestPath.mockImplementation((zoneId, gateId) => [zoneId, gateId]);
    mockGetNeighbors.mockImplementation((zoneId) => {
      const defaultCosts = { G1: 15, G2: 30, G3: 50, G4: 60 };
      const altCosts = { G1: 40, G2: 10, G3: 50, G4: 70 };
      const chosen = zoneId === 'A2' ? altCosts : defaultCosts;
      return Object.entries(chosen).map(([node, distance]) => ({ node, distance }));
    });
  });

  it('returns static group gate assignments', () => {
    const assignments = getGroupGateAssignments();
    expect(assignments.You).toBe('G3');
    expect(assignments.AK).toBe('G3');
    expect(assignments.RS).toBe('G2');
  });

  it('forces current fan to wave 2 and gate G3', () => {
    const plan = getEgressPlan('fan-1', { zoneId: 'A1-A4' });
    expect(plan.gate).toBe('G3');
    expect(plan.wave).toBe(2);
    expect(plan.departureTime).toBe(120);
    expect(plan.route).toContain('South spine');
  });

  it('uses group override gate for known members', () => {
    const plan = getEgressPlan('RS', { zoneId: 'B4-B6' });
    expect(plan.gate).toBe('G2');
    expect(plan.wave).toBe(2);
    expect(plan.departureTime).toBe(120);
  });

  it('selects nearest gate for generic fan and maps wave offsets', () => {
    const plan = getEgressPlan('fan-99', { zoneId: 'C1-C3' });
    expect(plan.gate).toBe('G1');
    expect(plan.wave).toBe(1);
    expect(plan.departureTime).toBe(0);
    expect(plan.congestionSavings).toBe(78);
  });
});
