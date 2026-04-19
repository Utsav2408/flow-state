export const BASELINE_WAIT = 5.5;
export const BASELINE_COMFORT = 66;
export const MAX_ALERTS = 20;

export const MATCH_STATES = {
  pre_match: 'Pre-match',
  live_play: 'Live',
  halftime: 'Halftime',
  post_match: 'Post-match',
  goal: 'Live',
};

export const MATCH_STATE_COLORS = {
  pre_match: '#6366f1',
  live_play: '#22c55e',
  halftime: '#f59e0b',
  post_match: '#94a3b8',
  goal: '#ef4444',
};

/** Operator → triggerEvent() keys (crowdSimulator) */
export const TRIGGER_EVENT_LABELS = {
  halftime: 'Halftime break',
  goal: 'Goal scored',
  rain_delay: 'Rain delay',
  post_match: 'Final whistle',
};

/** Zone group → Firebase zone ids (dashboard zone bars + alert logic) */
export const ZONE_GROUPS = {
  'A1-A4': ['A1', 'A2', 'A3', 'A4'],
  'B1-B3': ['B1', 'B2', 'B3'],
  'B4-B6': ['B4', 'B5', 'B6'],
  'C1-C3': ['C1', 'C2', 'C3'],
  'C4-C6': ['C4', 'C5', 'C6'],
  'D1-D3': ['D1', 'D2', 'D3'],
};
