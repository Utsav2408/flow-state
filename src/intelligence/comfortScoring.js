import {
  COMFORT_THRESHOLDS,
  COMFORT_WEIGHTS,
  WAIT_NORM_MINUTES,
  DEFAULT_DENSITY_GUESS,
} from '../config/comfortConfig';
import graph from '../models/venueGraph';

export { COMFORT_THRESHOLDS } from '../config/comfortConfig';

/**
 * Normalize zone density to a 0–100 percentage for the comfort formula.
 * Values in (0, 1) are treated as fractions (e.g. 0.52 → 52%).
 * Plain integers 1–100 are left as percentages.
 */
export function normalizeDensityPercent(raw) {
  if (raw == null || Number.isNaN(Number(raw))) return DEFAULT_DENSITY_GUESS;
  const n = Number(raw);
  if (n > 0 && n < 1) return n * 100;
  return n;
}

/**
 * Compute comfort score for a zone (0-100).
 *
 * Formula:
 *   comfort = 100 - (density × wD  +  waitPenalty × wW  +  noisePenalty × wN)
 *   waitPenalty  = min(nearestStandWait / WAIT_NORM_MINUTES, 1) × 100
 *   noisePenalty = min(density × 1.2, 100)
 *
 * @param {string} zoneId - Individual zone (e.g. 'B4') or zone group (e.g. 'B4-B6')
 * @param {Map<string, {density?: number}>} zones - Zone data map (from the store slice)
 * @param {Map<string, {waitTime?: number}>} stands - Stand data map (from the store slice)
 * @returns {number} Comfort score 0-100
 */
export function getComfortScore(zoneId, zones, stands) {
  let density = 0;
  let count = 0;

  if (zoneId && zoneId.includes('-')) {
    const parts = zoneId.split('-');
    const prefix = parts[0][0];
    const startNum = parseInt(parts[0].slice(1));
    const endNum = parseInt(parts[1].slice(1));
    for (let i = startNum; i <= endNum; i++) {
      const zData = zones.get(`${prefix}${i}`);
      if (zData?.density !== undefined) {
        density += normalizeDensityPercent(zData.density);
        count++;
      }
    }
    density = count > 0 ? density / count : DEFAULT_DENSITY_GUESS;
  } else {
    const zData = zones.get(zoneId);
    density =
      zData?.density !== undefined ? normalizeDensityPercent(zData.density) : DEFAULT_DENSITY_GUESS;
  }

  let nearestWait = WAIT_NORM_MINUTES;
  let hasLocalStands = false;

  const zonesToCheck = [];
  if (zoneId && zoneId.includes('-')) {
    const parts = zoneId.split('-');
    const prefix = parts[0][0];
    const startNum = parseInt(parts[0].slice(1));
    const endNum = parseInt(parts[1].slice(1));
    for (let i = startNum; i <= endNum; i++) {
      zonesToCheck.push(`${prefix}${i}`);
    }
  } else if (zoneId) {
    zonesToCheck.push(zoneId);
  }

  const localStands = new Set();
  for (const z of zonesToCheck) {
    const neighbors = graph.getNeighbors(z);
    for (const edge of neighbors) {
      if (graph.nodes.has(edge.node) && graph.nodes.get(edge.node).type === 'stand') {
        localStands.add(edge.node);
      }
    }
  }

  localStands.forEach(standId => {
    hasLocalStands = true;
    const standData = stands.get(standId);
    if (standData && standData.waitTime !== undefined && standData.waitTime !== null && standData.waitTime < nearestWait) {
      nearestWait = standData.waitTime;
    }
  });

  if (!hasLocalStands) {
    // Fallback if no specific connected stands
    stands.forEach((stand) => {
      if (stand.waitTime !== undefined && stand.waitTime !== null && stand.waitTime < nearestWait) {
        nearestWait = stand.waitTime;
      }
    });
  }

  const waitPenalty = Math.min(nearestWait / WAIT_NORM_MINUTES, 1) * 100;
  const noisePenalty = Math.min(density * 1.2, 100);

  const comfort = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        100 -
          (density * COMFORT_WEIGHTS.density +
            waitPenalty * COMFORT_WEIGHTS.wait +
            noisePenalty * COMFORT_WEIGHTS.noise)
      )
    )
  );

  if (import.meta.env.DEV) {
    console.log('[comfort]', { zoneId, density, waitPenalty, noisePenalty, comfort, nearestWait });
  }

  return comfort;
}

/**
 * Get comfort color based on score (thresholds from COMFORT_THRESHOLDS).
 */
export function getComfortColor(score) {
  if (score >= COMFORT_THRESHOLDS.good) return '#22C55E';
  if (score >= COMFORT_THRESHOLDS.moderate) return '#F59E0B';
  return '#EF4444';
}

/**
 * Get comfort level label.
 */
export function getComfortLabel(score) {
  if (score >= COMFORT_THRESHOLDS.good) return 'green';
  if (score >= COMFORT_THRESHOLDS.moderate) return 'amber';
  return 'red';
}
