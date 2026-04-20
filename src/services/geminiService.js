const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

async function askGemini(prompt) {
  if (!GEMINI_API_KEY) return null;

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { maxOutputTokens: 150, temperature: 0.7 },
      }),
    });

    if (!res.ok) return null;

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (e) {
    console.error('Gemini error:', e);
    return null;
  }
}

export async function generateActionRecommendation({
  zoneName,
  comfortScore,
  nearestStand,
  nearestWait,
  crowdLevel,
  matchState,
}) {
  const prompt = `You are FlowState, an AI stadium assistant. Given this live data:
- Fan's zone: ${zoneName} (comfort score: ${comfortScore}/100)
- Nearest food stand: ${nearestStand} (wait: ${nearestWait} min)
- Zone crowd level: ${crowdLevel}%
- Match state: ${matchState}

Write a SHORT, friendly, actionable recommendation (max 2 sentences).
If wait time is low, suggest grabbing food now.
If comfort is below 50, suggest moving to a quieter section.
If it's halftime, mention the rush is coming.
If match just ended, mention the exit plan.
Only return the recommendation text, nothing else.`;

  return askGemini(prompt);
}

export async function generateEgressTip({
  fanZone,
  assignedGate,
  wave,
  groupMembers,
  congestionSavings,
}) {
  const prompt = `You are FlowState, an AI stadium assistant helping a fan exit after the match. Context:
- Fan is in zone: ${fanZone}
- Assigned exit gate: ${assignedGate}
- Departure wave: ${wave} (they should wait before leaving)
- Group members: ${groupMembers.join(', ')} (most exiting via same gate)
- Waiting saves: ${congestionSavings}% congestion avoided

Write ONE short, encouraging, personalized tip (max 2 sentences) about their exit plan. Be specific about their gate and group. Make waiting feel like a smart choice, not a punishment. Only return the tip text.`;

  return askGemini(prompt);
}
