/** Shared with venue graph edge weights and Nash routing load updates. */
export const CONGESTION_LOAD_SQ_COEFF = 5;

export const EDGE_LOAD_INCREMENT = 0.015;

export const NASH_BATCH_MS = 2000;

/** Fallback when stand has no capacity in store (queue length fraction). */
export const DEFAULT_STAND_QUEUE_CAP = 200;

/** Default zone node when fan location is missing (graph id, not group). */
export const DEFAULT_FAN_GRAPH_ZONE = 'B4';

/** 
 * Simulated reroute display count constants for demo purposes. 
 * These artificially inflate the displayed Nash reroutes to visualize the AI activity.
 */
export const REROUTE_DISPLAY_BASE = 280;
export const REROUTE_DISPLAY_PER_CONFLICT = 95;
export const REROUTE_DISPLAY_PER_REQ = 45;
