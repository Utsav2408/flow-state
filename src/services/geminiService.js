import { getToken } from 'firebase/app-check';
import { appCheck, auth } from '../firebase';

const AI_GATEWAY_BASE_URL = (import.meta.env.VITE_AI_GATEWAY_URL ?? '/api/ai').replace(/\/+$/, '');

function safeStandName(standId) {
  const text = String(standId ?? '').trim();
  if (!text) return 'nearby stand';
  return text.startsWith('S') ? `Stand ${text.slice(1)}` : `Stand ${text}`;
}

function buildFallbackActionRecommendation({
  zoneName,
  comfortScore,
  nearestStand,
  nearestWait,
  crowdLevel,
  matchState,
}) {
  const wait = Number(nearestWait);
  const comfort = Number(comfortScore);
  const crowd = Number(crowdLevel);
  const state = String(matchState ?? '').toLowerCase();
  const stand = safeStandName(nearestStand);

  if (state.includes('post')) {
    return `Match just ended. Head toward your assigned gate now and avoid stopping en route from ${zoneName}.`;
  }

  if (state.includes('half') && Number.isFinite(wait) && wait <= 5) {
    return `Great window for food: ${stand} is around ${wait} min right now. Grab it before the halftime surge starts.`;
  }

  if (Number.isFinite(comfort) && comfort < 50) {
    return `Your section is crowded at the moment. Move briefly to a quieter concourse, then re-enter once flow improves.`;
  }

  if (Number.isFinite(crowd) && crowd >= 70) {
    return `Footfall around ${zoneName} is high. Use wider aisles and start movement a minute early to skip chokepoints.`;
  }

  if (Number.isFinite(wait) && wait <= 3) {
    return `${stand} has a short line now. This is a good time to grab food without missing much action.`;
  }

  return 'You are in a stable zone right now. Stay put, and watch for the next low-wait food window.';
}

function buildFallbackEgressTip({
  assignedGate,
  wave,
  groupMembers,
  congestionSavings,
}) {
  const names = Array.isArray(groupMembers) ? groupMembers.filter(Boolean) : [];
  const groupLine = names.length > 0 ? `with ${names.join(', ')}` : 'with your group';
  const savings = Number.isFinite(Number(congestionSavings))
    ? `${Math.max(0, Math.round(Number(congestionSavings)))}%`
    : 'major';

  return `Exit via ${assignedGate} at ${wave} ${groupLine}. Waiting briefly is the smart move and can avoid about ${savings} congestion.`;
}

async function getAuthBearerToken() {
  if (!auth?.currentUser) return null;
  try {
    const idToken = await auth.currentUser.getIdToken();
    return idToken ? `Bearer ${idToken}` : null;
  } catch {
    return null;
  }
}

async function getAppCheckToken() {
  if (!appCheck) return null;
  try {
    const result = await getToken(appCheck);
    return result?.token ?? null;
  } catch {
    return null;
  }
}

async function requestAiRecommendation(path, payload) {
  const endpoint = path.startsWith('/') ? path : `/${path}`;
  const url = `${AI_GATEWAY_BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
  };

  const [authHeader, appCheckToken] = await Promise.all([getAuthBearerToken(), getAppCheckToken()]);
  if (authHeader) headers.Authorization = authHeader;
  if (appCheckToken) headers['X-Firebase-AppCheck'] = appCheckToken;

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`AI gateway request failed (${response.status})`);
  }

  const data = await response.json();
  const text = typeof data?.text === 'string' ? data.text.trim() : '';
  if (!text) {
    throw new Error('AI gateway returned an empty recommendation');
  }
  return text;
}

export async function generateActionRecommendation(payload) {
  try {
    return await requestAiRecommendation('/action-recommendation', payload);
  } catch {
    return buildFallbackActionRecommendation(payload);
  }
}

export async function generateEgressTip(payload) {
  try {
    return await requestAiRecommendation('/egress-tip', payload);
  } catch {
    return buildFallbackEgressTip(payload);
  }
}
