/** Single source for comfort scoring, labels, UI density bands, and heatmap coloring. */

export const COMFORT_THRESHOLDS = {
  /** Green zone */
  good: 70,
  /** Amber zone (scores in [moderate, good)) */
  moderate: 40,
};

export const COMFORT_WEIGHTS = {
  density: 0.5,
  wait: 0.3,
  noise: 0.2,
};

/** Normalize stand wait in comfort formula (minutes). */
export const WAIT_NORM_MINUTES = 15;

/** When zone density is unknown, assume mid band. */
export const DEFAULT_DENSITY_GUESS = 50;

/**
 * Heatmap / zone label colors (density %), aligned with COMFORT_THRESHOLDS where possible.
 * low: relaxed, mid: elevated, high: congested (pulse when very high).
 */
export const DENSITY_UI = {
  lowMax: 40,
  midMax: 70,
  pulseAbove: 80,
};
