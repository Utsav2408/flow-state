import { useStore } from '../store/useStore';

/**
 * Compute comfort score for a zone (0-100).
 *
 * Formula:
 *   comfort = 100 - (density × 0.5  +  waitPenalty × 0.3  +  noisePenalty × 0.2)
 *   waitPenalty  = min(nearestStandWait / 15, 1) × 100
 *   noisePenalty = min(density × 1.2, 100)
 *
 * @param {string} zoneId - Individual zone (e.g. 'B4') or zone group (e.g. 'B4-B6')
 * @returns {number} Comfort score 0-100
 */
export function getComfortScore(zoneId) {
  const store = useStore.getState();
  const zones = store.zones;
  const stands = store.stands;

  // ── Density (handle zone groups like 'B4-B6') ──────────────────────
  let density = 0;
  let count = 0;

  if (zoneId && zoneId.includes('-')) {
    const parts = zoneId.split('-');
    const prefix = parts[0][0]; // 'B'
    const startNum = parseInt(parts[0].slice(1)); // 4
    const endNum = parseInt(parts[1].slice(1));   // 6
    for (let i = startNum; i <= endNum; i++) {
      const zData = zones.get(`${prefix}${i}`);
      if (zData?.density !== undefined) {
        density += zData.density;
        count++;
      }
    }
    density = count > 0 ? density / count : 50;
  } else {
    const zData = zones.get(zoneId);
    density = zData?.density ?? 50;
  }

  // ── Nearest stand wait time ────────────────────────────────────────
  let nearestWait = 15; // default cap
  stands.forEach((stand) => {
    if (stand.waitTime !== undefined && stand.waitTime < nearestWait) {
      nearestWait = stand.waitTime;
    }
  });

  // ── Penalties ──────────────────────────────────────────────────────
  const waitPenalty = Math.min(nearestWait / 15, 1) * 100;
  const noisePenalty = Math.min(density * 1.2, 100);

  const comfort = Math.max(0, Math.min(100, Math.round(
    100 - (density * 0.5 + waitPenalty * 0.3 + noisePenalty * 0.2)
  )));

  return comfort;
}

/**
 * Get comfort color based on score.
 *   Green : 70+
 *   Amber : 40-69
 *   Red   : <40
 */
export function getComfortColor(score) {
  if (score >= 70) return '#22C55E';
  if (score >= 40) return '#F59E0B';
  return '#EF4444';
}

/**
 * Get comfort level label.
 */
export function getComfortLabel(score) {
  if (score >= 70) return 'green';
  if (score >= 40) return 'amber';
  return 'red';
}
