// Builds the set of colours a painter could mix from a given palette, and
// measures its extent. Everything here is deterministic and cheap enough to
// run on the main thread for one palette (a few thousand mixes).
import { hexToLinear, ksFromLinear, linearToOklab, kmMix, linearToRgb255 } from './color.js';

const RATIOS = [0.2, 0.4, 0.6, 0.8];
const WHITE_LEVELS = [0.3, 0.6, 0.85];
const BLACK_LEVELS = [0.2, 0.45, 0.7, 0.88];
const GLAZE_LEVELS = [0.4, 0.18, 0.08];

const prepared = new Map();
export function prepare(p) {
  if (prepared.has(p.id)) return prepared.get(p.id);
  const lin = hexToLinear(p.hex);
  const q = { id: p.id, p, lin, ks: ksFromLinear(lin), ok: linearToOklab(...lin), T: p.T ?? 1 };
  prepared.set(p.id, q);
  return q;
}

/**
 * @returns {{ok: number[][], rgb: number[][], recipe: number[][]}} parallel arrays;
 * recipe holds indexes into `pigments` (the input order).
 */
export function reachable(pigments) {
  const pigs = pigments.map(prepare);
  const index = new Map(pigs.map((q, i) => [q.id, i]));
  const whites = pigs.filter((q) => q.p.role === 'white').sort((a, b) => b.ok[0] - a.ok[0]);
  const blacks = pigs.filter((q) => q.p.role === 'black');
  const white = whites[0] || null;
  const black = blacks[0] || null;

  const ok = [];
  const rgb = [];
  const recipe = [];
  const seen = new Set();
  const addLinear = (lin, rec) => {
    const o = linearToOklab(lin[0], lin[1], lin[2]);
    const key = `${Math.round(o[0] * 140)},${Math.round(o[1] * 140)},${Math.round(o[2] * 140)}`;
    if (seen.has(key)) return;
    seen.add(key);
    ok.push(o);
    rgb.push(linearToRgb255(lin));
    recipe.push(rec);
  };
  const add = (parts) => {
    const lin = kmMix(parts);
    const o = linearToOklab(lin[0], lin[1], lin[2]);
    const key = `${Math.round(o[0] * 140)},${Math.round(o[1] * 140)},${Math.round(o[2] * 140)}`;
    if (seen.has(key)) return;
    seen.add(key);
    ok.push(o);
    rgb.push(linearToRgb255(lin));
    recipe.push([...new Set(parts.map(([q]) => index.get(q.id)))]);
  };

  const bases = pigs.map((q) => [[q, 1]]);
  for (let i = 0; i < pigs.length; i++) {
    for (let j = i + 1; j < pigs.length; j++) {
      if (pigs[i].p.role === 'white' || pigs[j].p.role === 'white') continue; // whites handled below
      for (const r of RATIOS) bases.push([[pigs[i], r], [pigs[j], 1 - r]]);
    }
  }
  // Tint with the brightest white and, if different, lead white (the
  // painter's standard white for two thousand years); other whites tint
  // single pigments only.
  const lead = whites.find((q) => q.id === 'lead-white');
  const tinters = [white, lead].filter((q, i, arr) => q && arr.indexOf(q) === i);
  for (const parts of bases) {
    add(parts);
    for (const wq of tinters) {
      if (parts.some(([q]) => q === wq)) continue;
      for (const w of WHITE_LEVELS) add([...parts.map(([q, a]) => [q, a * (1 - w)]), [wq, w]]);
    }
  }
  for (const wq of whites.filter((q) => !tinters.includes(q))) {
    for (const q of pigs) if (q.p.role !== 'white') for (const w of WHITE_LEVELS) add([[q, 1 - w], [wq, w]]);
  }
  if (black) {
    for (const q of pigs) {
      if (q === black || q.p.role === 'white') continue;
      for (const k of BLACK_LEVELS) add([[q, 1 - k], [black, k]]);
    }
    // Transparent pigments glazed thinly over a black underlayer give the deep,
    // saturated darks of Old Master backgrounds. Modelled as the pigment's own
    // reflectance scaled down (light passes the glaze twice and is absorbed below).
    for (const q of pigs) {
      if (!q.p.glaze) continue;
      for (const f of GLAZE_LEVELS) addLinear(q.lin.map((v) => v * f), [index.get(q.id), index.get(black.id)]);
    }
  }
  return { ok, rgb, recipe };
}

// Andrew's monotone chain on the (a, b) chroma plane.
export function hull2d(points) {
  const pts = points.map((p) => [p[1], p[2]]).sort((p, q) => p[0] - q[0] || p[1] - q[1]);
  if (pts.length < 3) return pts;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lower = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  upper.pop();
  lower.pop();
  return lower.concat(upper);
}

export function polygonArea(poly) {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    s += x1 * y2 - x2 * y1;
  }
  return Math.abs(s) / 2;
}
