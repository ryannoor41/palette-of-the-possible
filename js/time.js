// Shared time model: a non-linear scale (prehistory is compressed, the
// crowded nineteenth century is stretched) plus helpers for availability.

export const MIN_YEAR = -40000;
export const MAX_YEAR = 2026;

// [year, position 0..1]
const STOPS = [
  [-40000, 0],
  [-3000, 0.11],
  [500, 0.29],
  [1400, 0.42],
  [1800, 0.62],
  [1900, 0.82],
  [2026, 1],
];

export const ERAS = [
  { from: -40000, to: -3001, name: 'Prehistory', short: 'Prehistory' },
  { from: -3000, to: 499, name: 'Antiquity', short: 'Antiquity' },
  { from: 500, to: 1399, name: 'Middle Ages', short: 'Middle Ages' },
  { from: 1400, to: 1699, name: 'Renaissance & Baroque', short: 'Renaissance' },
  { from: 1700, to: 1799, name: 'Enlightenment', short: '1700s' },
  { from: 1800, to: 1899, name: 'Chemical century', short: '1800s' },
  { from: 1900, to: 2026, name: 'Modern', short: 'Modern' },
];

export function yearToT(y) {
  y = Math.max(MIN_YEAR, Math.min(MAX_YEAR, y));
  for (let i = 1; i < STOPS.length; i++) {
    const [y1, t1] = STOPS[i];
    const [y0, t0] = STOPS[i - 1];
    if (y <= y1) return t0 + ((y - y0) / (y1 - y0)) * (t1 - t0);
  }
  return 1;
}

export function tToYear(t) {
  t = Math.max(0, Math.min(1, t));
  for (let i = 1; i < STOPS.length; i++) {
    const [y1, t1] = STOPS[i];
    const [y0, t0] = STOPS[i - 1];
    if (t <= t1) return y0 + ((t - t0) / (t1 - t0)) * (y1 - y0);
  }
  return MAX_YEAR;
}

// Snap to a sensible precision for the part of the scale we are in.
export function roundYear(y) {
  if (y < -3000) return Math.round(y / 500) * 500;
  if (y < 500) return Math.round(y / 10) * 10;
  return Math.round(y);
}

export function formatYear(y, { long = false } = {}) {
  if (y <= 0) {
    const v = Math.abs(y) + (y === 0 ? 1 : 0);
    return `${v.toLocaleString('en-US')} BCE`;
  }
  if (y < 1000) return `${y} CE`;
  return long ? `the year ${y}` : String(y);
}

// Split a year into the numeral and an era suffix for big display type.
export function yearParts(y) {
  if (y <= 0) return { num: (Math.abs(y) + (y === 0 ? 1 : 0)).toLocaleString('en-US'), era: 'BCE' };
  if (y < 1000) return { num: String(y), era: 'CE' };
  return { num: String(y), era: '' };
}

export function eraOf(y) {
  return ERAS.find((e) => y >= e.from && y <= e.to) || ERAS[ERAS.length - 1];
}

// ---- availability --------------------------------------------------------
export function spanFor(p, region) {
  return region === 'eu' ? p.eu : p.world;
}

export function statusAt(p, year, region) {
  const s = spanFor(p, region);
  if (!s) return 'never';
  const [a, b] = s;
  if (year < a) return 'future';
  if (b != null && year > b) return 'lost';
  return 'available';
}

export function availableAt(pigments, year, region, opts = {}) {
  return pigments.filter((p) => {
    if (opts.modestPatron && p.luxury) return false;
    return statusAt(p, year, region) === 'available';
  });
}

// Chronological list of arrivals and losses for a region.
export function eventsFor(pigments, region) {
  const ev = [];
  for (const p of pigments) {
    const s = spanFor(p, region);
    if (!s) continue;
    if (s[0] > MIN_YEAR) ev.push({ year: s[0], type: 'arrival', pigment: p });
    if (s[1] != null) ev.push({ year: s[1] + 1, type: 'loss', pigment: p });
  }
  return ev.sort((a, b) => a.year - b.year);
}

export function paletteKey(pigs) {
  return pigs.map((p) => p.id).sort().join('|');
}
