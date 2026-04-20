/**
 * Logical-space label placement for VenueMapCanvas: separates zone density labels
 * from stand markers/text so bounding boxes do not overlap.
 */

function rectsOverlap(a, b) {
  return !(a.right <= b.left || a.left >= b.right || a.bottom <= b.top || a.top >= b.bottom);
}

/** Zone: two-line block (id + %) — generous box for collision checks */
function zoneLabelRect(zx, zy, ox, oy) {
  const w = 112;
  const h = 44;
  return {
    left: zx + ox - w / 2,
    top: zy + oy - h / 2,
    right: zx + ox + w / 2,
    bottom: zy + oy + h / 2,
  };
}

/** Stand marker (blue square) with small padding */
function standMarkerRect(sp) {
  return {
    left: sp.x - 11,
    top: sp.y - 11,
    right: sp.x + 11,
    bottom: sp.y + 11,
  };
}

/** Text to the right of marker: "S1 - 12m" */
function standLabelRightRect(sp) {
  const w = 82;
  const h = 18;
  return {
    left: sp.x + 14,
    top: sp.y - h / 2,
    right: sp.x + 14 + w,
    bottom: sp.y + h / 2,
  };
}

function standLabelLeftRect(sp) {
  const w = 82;
  const h = 18;
  return {
    left: sp.x - 14 - w,
    top: sp.y - h / 2,
    right: sp.x - 14,
    bottom: sp.y + h / 2,
  };
}

/**
 * @param {Array<{id:string,x:number,y:number}>} zoneGroups
 * @param {Array<{id:string,x:number,y:number}>} stands
 * @param {{ cx: number, cy: number }} origin — stadium center for fallback push direction
 * @returns {Record<string, { dx: number, dy: number }>}
 */
export function computeZoneLabelOffsets(zoneGroups, stands, origin) {
  const { cx, cy } = origin;
  const zones = zoneGroups.map((z) => ({
    id: z.id,
    x: z.x,
    y: z.y,
    ox: 0,
    oy: 0,
  }));

  const iterations = 50;
  const step = 4;
  const maxOff = 88;

  for (let iter = 0; iter < iterations; iter++) {
    for (const z of zones) {
      for (const sp of stands) {
        const zr = zoneLabelRect(z.x, z.y, z.ox, z.oy);
        const sr = standMarkerRect(sp);
        if (!rectsOverlap(zr, sr)) continue;

        let vx = z.x + z.ox - sp.x;
        let vy = z.y + z.oy - sp.y;
        if (Math.hypot(vx, vy) < 1e-3) {
          vx = z.x - cx;
          vy = z.y - cy;
        }
        const len = Math.hypot(vx, vy) || 1;
        vx /= len;
        vy /= len;
        z.ox += vx * step;
        z.oy += vy * step;
      }

      // Avoid overlapping other zone labels (lighter separation)
      for (const other of zones) {
        if (other === z) continue;
        const a = zoneLabelRect(z.x, z.y, z.ox, z.oy);
        const b = zoneLabelRect(other.x, other.y, other.ox, other.oy);
        if (!rectsOverlap(a, b)) continue;
        let vx = z.x + z.ox - (other.x + other.ox);
        let vy = z.y + z.oy - (other.y + other.oy);
        const len = Math.hypot(vx, vy) || 1;
        vx /= len;
        vy /= len;
        z.ox += vx * (step * 0.35);
        z.oy += vy * (step * 0.35);
      }
    }

    for (const z of zones) {
      z.ox = Math.max(-maxOff, Math.min(maxOff, z.ox));
      z.oy = Math.max(-maxOff, Math.min(maxOff, z.oy));
    }
  }

  return Object.fromEntries(zones.map((z) => [z.id, { dx: z.ox, dy: z.oy }]));
}

/**
 * @param {Array<{id:string,x:number,y:number}>} stands
 * @param {Array<{id:string,x:number,y:number}>} zoneGroups
 * @param {Record<string, { dx: number, dy: number }>} zoneOffsets
 * @returns {Record<string, 'left' | 'right'>}
 */
export function computeStandLabelSides(stands, zoneGroups, zoneOffsets) {
  const zRects = zoneGroups.map((zg) => {
    const o = zoneOffsets[zg.id] || { dx: 0, dy: 0 };
    return zoneLabelRect(zg.x, zg.y, o.dx, o.dy);
  });

  /** @type {Record<string, 'left' | 'right'>} */
  const out = {};

  for (const sp of stands) {
    const rr = standLabelRightRect(sp);
    const rl = standLabelLeftRect(sp);
    let scoreR = 0;
    let scoreL = 0;
    for (const zr of zRects) {
      if (rectsOverlap(rr, zr)) scoreR += 1;
      if (rectsOverlap(rl, zr)) scoreL += 1;
    }
    out[sp.id] = scoreL < scoreR ? 'left' : 'right';
  }

  return out;
}
