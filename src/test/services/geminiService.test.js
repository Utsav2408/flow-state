import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

async function loadServiceModule() {
  vi.resetModules();
  return import('../../services/geminiService');
}

describe('geminiService', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.unstubAllEnvs();
  });

  it('returns null when API key is missing', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', '');
    const { generateActionRecommendation } = await loadServiceModule();

    const result = await generateActionRecommendation({
      zoneName: 'B4',
      comfortScore: 72,
      nearestStand: 'S3',
      nearestWait: 4,
      crowdLevel: 40,
      matchState: 'HALFTIME',
    });

    expect(result).toBeNull();
  });

  it('returns parsed text when Gemini request succeeds', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Grab food now at S3.' }] } }],
      }),
    });

    const { generateActionRecommendation } = await loadServiceModule();
    const result = await generateActionRecommendation({
      zoneName: 'B4',
      comfortScore: 72,
      nearestStand: 'S3',
      nearestWait: 4,
      crowdLevel: 40,
      matchState: 'HALFTIME',
    });

    expect(result).toBe('Grab food now at S3.');
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);

    const [url, request] = globalThis.fetch.mock.calls[0];
    expect(url).toContain('generativelanguage.googleapis.com');
    expect(url).toContain('key=test-key');
    expect(request.method).toBe('POST');

    const body = JSON.parse(request.body);
    expect(body.contents[0].parts[0].text).toContain("Fan's zone: B4");
  });

  it('includes gate and group context in egress prompt', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'Wait and leave via G3 together.' }] } }],
      }),
    });

    const { generateEgressTip } = await loadServiceModule();
    await generateEgressTip({
      fanZone: 'B4-B6',
      assignedGate: 'G3',
      wave: 'T+180s',
      groupMembers: ['You', 'Arjun K'],
      congestionSavings: 78,
    });

    const [, request] = globalThis.fetch.mock.calls[0];
    const body = JSON.parse(request.body);
    const prompt = body.contents[0].parts[0].text;
    expect(prompt).toContain('Assigned exit gate: G3');
    expect(prompt).toContain('Group members: You, Arjun K');
  });

  it('returns null when Gemini returns non-OK response', async () => {
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    });

    const { generateActionRecommendation } = await loadServiceModule();
    const result = await generateActionRecommendation({
      zoneName: 'B4',
      comfortScore: 50,
      nearestStand: 'S1',
      nearestWait: 8,
      crowdLevel: 60,
      matchState: 'MATCH_IN_PROGRESS',
    });

    expect(result).toBeNull();
  });

  it('returns null and logs error on fetch failure', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.stubEnv('VITE_GEMINI_API_KEY', 'test-key');
    globalThis.fetch = vi.fn().mockRejectedValue(new Error('network error'));

    const { generateEgressTip } = await loadServiceModule();
    const result = await generateEgressTip({
      fanZone: 'B4-B6',
      assignedGate: 'G3',
      wave: 'T+180s',
      groupMembers: ['You', 'Arjun K'],
      congestionSavings: 78,
    });

    expect(result).toBeNull();
    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});
