/** density 0–100 → comfort 0–100 (inverted) */
export function densityToComfort(density) {
  return Math.max(0, Math.min(100, Math.round(100 - density)));
}

export function formatSimTime(secs) {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Short wall-clock string for “event started” banners */
export function formatWallClock(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatTimeAgo(ts) {
  if (!ts) return '';
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
}

export function computeAvgWait(stands) {
  if (!stands || stands.size === 0) return 0;
  let total = 0;
  let count = 0;
  stands.forEach((s) => {
    if (s.waitTime !== undefined) {
      total += s.waitTime;
      count++;
    }
  });
  return count > 0 ? total / count : 0;
}

export function computeAvgDensity(zones) {
  if (!zones || zones.size === 0) return 0;
  let total = 0;
  let count = 0;
  zones.forEach((z) => {
    if (z.density !== undefined) {
      total += z.density;
      count++;
    }
  });
  return count > 0 ? total / count : 0;
}
