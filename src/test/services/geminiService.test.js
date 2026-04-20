import { describe, expect, it, vi } from 'vitest';

async function loadServiceModule() {
  vi.resetModules();
  return import('../../services/geminiService');
}

describe('geminiService', () => {
  it('returns a halftime food recommendation when wait is low', async () => {
    const { generateActionRecommendation } = await loadServiceModule();

    const result = await generateActionRecommendation({
      zoneName: 'B4',
      comfortScore: 72,
      nearestStand: 'S3',
      nearestWait: 4,
      crowdLevel: 40,
      matchState: 'HALFTIME',
    });

    expect(result).toContain('halftime');
    expect(result).toContain('Stand 3');
  });

  it('returns post-match egress guidance when state is post-match', async () => {
    const { generateActionRecommendation } = await loadServiceModule();
    const result = await generateActionRecommendation({
      zoneName: 'B4',
      comfortScore: 48,
      nearestStand: 'S3',
      nearestWait: 9,
      crowdLevel: 85,
      matchState: 'post_match',
    });

    expect(result).toContain('Match just ended');
    expect(result).toContain('assigned gate');
  });

  it('returns deterministic egress tip with gate and group', async () => {
    const { generateEgressTip } = await loadServiceModule();
    const result = await generateEgressTip({
      fanZone: 'B4-B6',
      assignedGate: 'G3',
      wave: 'T+180s',
      groupMembers: ['You', 'Arjun K'],
      congestionSavings: 78,
    });

    expect(result).toContain('G3');
    expect(result).toContain('You, Arjun K');
    expect(result).toContain('78%');
  });

  it('returns crowd guidance when crowd level is high', async () => {
    const { generateActionRecommendation } = await loadServiceModule();
    const result = await generateActionRecommendation({
      zoneName: 'B4',
      comfortScore: 65,
      nearestStand: 'S1',
      nearestWait: 8,
      crowdLevel: 88,
      matchState: 'MATCH_IN_PROGRESS',
    });

    expect(result).toContain('Footfall');
  });
});
