import { initializeApp } from 'firebase-admin/app';
import { getAppCheck } from 'firebase-admin/app-check';
import { getAuth } from 'firebase-admin/auth';
import { logger } from 'firebase-functions';
import { onRequest } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

initializeApp();

const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');
const DEFAULT_MODEL = 'gemini-1.5-flash';
const MAX_CHARS = 120;

function trimText(input, max = MAX_CHARS) {
  return String(input ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

function normalizeNumber(input, fallback = 0) {
  const value = Number(input);
  return Number.isFinite(value) ? value : fallback;
}

function parseRequestType(pathname) {
  if (pathname.endsWith('/action-recommendation')) return 'action';
  if (pathname.endsWith('/egress-tip')) return 'egress';
  return null;
}

function buildActionPrompt(body) {
  const zoneName = trimText(body.zoneName, 32) || 'current zone';
  const stand = trimText(body.nearestStand, 12) || 'nearby stand';
  const matchState = trimText(body.matchState, 24) || 'in_match';
  const wait = Math.max(0, normalizeNumber(body.nearestWait, 0));
  const comfort = Math.max(0, Math.min(100, normalizeNumber(body.comfortScore, 50)));
  const crowd = Math.max(0, Math.min(100, normalizeNumber(body.crowdLevel, 50)));

  return [
    'You are FlowState, a stadium assistant.',
    'Write one short recommendation sentence (max 28 words).',
    'Be specific and actionable. No markdown, no bullet points, no prefix labels.',
    `Context: zone=${zoneName}, comfort=${comfort}/100, crowd=${crowd}/100, nearestStand=${stand}, nearestWaitMins=${wait}, matchState=${matchState}.`,
  ].join('\n');
}

function buildEgressPrompt(body) {
  const gate = trimText(body.assignedGate, 12) || 'assigned gate';
  const wave = trimText(body.wave, 24) || 'scheduled wave';
  const names = Array.isArray(body.groupMembers)
    ? body.groupMembers.map((name) => trimText(name, 24)).filter(Boolean).slice(0, 5)
    : [];
  const groupMembers = names.length ? names.join(', ') : 'your group';
  const savings = Math.max(0, Math.min(100, normalizeNumber(body.congestionSavings, 50)));

  return [
    'You are FlowState, a stadium egress assistant.',
    'Write one short egress tip sentence (max 28 words).',
    'Mention gate and timing confidence. No markdown, no bullet points, no prefix labels.',
    `Context: gate=${gate}, wave=${wave}, groupMembers=${groupMembers}, estimatedCongestionSavingsPercent=${savings}.`,
  ].join('\n');
}

async function verifyClientRequest(req, allowUnverified) {
  if (allowUnverified) return;

  const authHeader = req.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    throw new Error('Missing Firebase Auth bearer token');
  }
  const idToken = authHeader.slice('Bearer '.length).trim();
  await getAuth().verifyIdToken(idToken);

  const appCheckToken = req.get('X-Firebase-AppCheck');
  if (!appCheckToken) {
    throw new Error('Missing Firebase App Check token');
  }
  await getAppCheck().verifyToken(appCheckToken);
}

async function generateTextWithGemini(prompt, apiKey) {
  const model = process.env.GEMINI_MODEL || DEFAULT_MODEL;
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 100,
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Gemini API failed (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const parts = data?.candidates?.[0]?.content?.parts;
  const text = Array.isArray(parts)
    ? parts
        .map((part) => (typeof part?.text === 'string' ? part.text : ''))
        .join(' ')
        .trim()
    : '';

  if (!text) {
    throw new Error('Gemini API returned an empty response');
  }
  return trimText(text, MAX_CHARS);
}

export const aiGateway = onRequest(
  {
    region: 'us-central1',
    timeoutSeconds: 15,
    memory: '256MiB',
    secrets: [GEMINI_API_KEY],
  },
  async (req, res) => {
    const requestPath = new URL(req.originalUrl, 'https://flowstate.local').pathname;
    const requestType = parseRequestType(requestPath);
    const allowUnverified = process.env.ALLOW_UNVERIFIED_AI_REQUESTS === 'true';

    res.set('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Method not allowed' });
      return;
    }

    if (!requestType) {
      res.status(404).json({ error: 'Unknown AI endpoint' });
      return;
    }

    try {
      await verifyClientRequest(req, allowUnverified);
      const apiKey = GEMINI_API_KEY.value();
      if (!apiKey) {
        throw new Error('Gemini secret is not configured');
      }

      const prompt =
        requestType === 'action' ? buildActionPrompt(req.body ?? {}) : buildEgressPrompt(req.body ?? {});
      const text = await generateTextWithGemini(prompt, apiKey);
      res.status(200).json({ text });
    } catch (error) {
      logger.error('aiGateway request failed', {
        path: requestPath,
        message: error instanceof Error ? error.message : 'Unknown error',
      });
      res.status(500).json({ error: 'Unable to generate AI recommendation' });
    }
  },
);
