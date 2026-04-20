/**
 * Security hardening:
 * - Never call Gemini directly from browser code.
 * - API keys in VITE_* vars are always public and visible in bundled JS.
 * This local fallback keeps UX stable until a server-side function is wired.
 */
function safeStandName(standId) {
  const text = String(standId ?? '').trim();
  if (!text) return 'nearby stand';
  return text.startsWith('S') ? `Stand ${text.slice(1)}` : `Stand ${text}`;
}

export async function generateActionRecommendation({
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

export async function generateEgressTip({
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
