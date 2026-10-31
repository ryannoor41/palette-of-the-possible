// A small, honest X-ray fluorescence simulator. Peak energies are real
// emission-line energies (keV); intensities are illustrative, not quantitative.

export const LINES = {
  Si: { name: 'Silicon', Z: 14, lines: [['Kα', 1.74, 1]] },
  P: { name: 'Phosphorus', Z: 15, lines: [['Kα', 2.013, 1]] },
  S: { name: 'Sulfur', Z: 16, lines: [['Kα', 2.307, 1]] },
  Cl: { name: 'Chlorine', Z: 17, lines: [['Kα', 2.622, 1]] },
  Ar: { name: 'Argon (air)', Z: 18, lines: [['Kα', 2.957, 1]] },
  K: { name: 'Potassium', Z: 19, lines: [['Kα', 3.313, 1], ['Kβ', 3.59, 0.12]] },
  Ca: { name: 'Calcium', Z: 20, lines: [['Kα', 3.691, 1], ['Kβ', 4.012, 0.13]] },
  Ti: { name: 'Titanium', Z: 22, lines: [['Kα', 4.51, 1], ['Kβ', 4.931, 0.14]] },
  Cr: { name: 'Chromium', Z: 24, lines: [['Kα', 5.414, 1], ['Kβ', 5.946, 0.14]] },
  Mn: { name: 'Manganese', Z: 25, lines: [['Kα', 5.898, 1], ['Kβ', 6.49, 0.14]] },
  Fe: { name: 'Iron', Z: 26, lines: [['Kα', 6.403, 1], ['Kβ', 7.057, 0.14]] },
  Co: { name: 'Cobalt', Z: 27, lines: [['Kα', 6.93, 1], ['Kβ', 7.649, 0.14]] },
  Ni: { name: 'Nickel', Z: 28, lines: [['Kα', 7.477, 1], ['Kβ', 8.264, 0.14]] },
  Cu: { name: 'Copper', Z: 29, lines: [['Kα', 8.047, 1], ['Kβ', 8.904, 0.15]] },
  Zn: { name: 'Zinc', Z: 30, lines: [['Kα', 8.638, 1], ['Kβ', 9.571, 0.15]] },
  As: { name: 'Arsenic', Z: 33, lines: [['Kα', 10.543, 1], ['Kβ', 11.725, 0.16]] },
  Se: { name: 'Selenium', Z: 34, lines: [['Kα', 11.222, 1], ['Kβ', 12.495, 0.16]] },
  Br: { name: 'Bromine', Z: 35, lines: [['Kα', 11.924, 1], ['Kβ', 13.291, 0.17]] },
  Sr: { name: 'Strontium', Z: 38, lines: [['Kα', 14.165, 1], ['Kβ', 15.835, 0.17]] },
  Y: { name: 'Yttrium', Z: 39, lines: [['Kα', 14.958, 1], ['Kβ', 16.737, 0.17]] },
  Cd: { name: 'Cadmium', Z: 48, lines: [['Kα', 23.174, 1], ['Kβ', 26.095, 0.2], ['Lα', 3.133, 0.25]] },
  In: { name: 'Indium', Z: 49, lines: [['Kα', 24.21, 1], ['Kβ', 27.276, 0.2], ['Lα', 3.287, 0.25]] },
  Sn: { name: 'Tin', Z: 50, lines: [['Kα', 25.271, 1], ['Kβ', 28.486, 0.2], ['Lα', 3.444, 0.3]] },
  Sb: { name: 'Antimony', Z: 51, lines: [['Kα', 26.359, 1], ['Kβ', 29.726, 0.2], ['Lα', 3.605, 0.3]] },
  Ba: { name: 'Barium', Z: 56, lines: [['Lα', 4.466, 1], ['Lβ', 4.828, 0.6]] },
  Au: { name: 'Gold', Z: 79, lines: [['Lα', 9.713, 1], ['Lβ', 11.442, 0.8], ['Mα', 2.123, 0.3]] },
  Hg: { name: 'Mercury', Z: 80, lines: [['Lα', 9.989, 1], ['Lβ', 11.823, 0.85], ['Mα', 2.195, 0.3]] },
  Pb: { name: 'Lead', Z: 82, lines: [['Lα', 10.551, 1], ['Lβ', 12.614, 0.9], ['Lγ', 14.764, 0.12], ['Mα', 2.346, 0.3]] },
  Bi: { name: 'Bismuth', Z: 83, lines: [['Lα', 10.839, 1], ['Lβ', 13.024, 0.85]] },
  Rh: { name: 'Rhodium (X-ray tube)', Z: 45, lines: [['Kα', 20.216, 1], ['Kβ', 22.724, 0.2]] },
};

// Elements a lab would report from a painting (excludes air and tube lines).
export const REPORTABLE = Object.keys(LINES).filter((e) => e !== 'Ar' && e !== 'Rh');

export const E_MAX = 30;
const STEP = 0.02;

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Rough instrument response: light elements are absorbed by air; the
// detector loses efficiency at high energy.
function response(E) {
  const air = 1 - Math.exp(-Math.pow(E / 2.6, 3));
  const det = Math.exp(-Math.pow(E / 34, 3));
  return air * det;
}

function fwhm(E) {
  return Math.sqrt(0.11 * 0.11 + 0.0032 * E);
}

/**
 * composition: { Pb: 1, Hg: 0.3, ... } relative signal strengths (0..1)
 * returns { E: Float32Array, I: Float32Array, peaks: [{el, line, e, h}] }
 */
export function simulate(composition, seed = 7) {
  const rand = mulberry32(seed);
  const n = Math.round(E_MAX / STEP) + 1;
  const E = new Float32Array(n);
  const I = new Float32Array(n);
  for (let i = 0; i < n; i++) E[i] = i * STEP;

  const comp = { Ar: 0.05, ...composition };
  const peaks = [];
  const addPeak = (e, amp) => {
    const s = fwhm(e) / 2.355;
    const lo = Math.max(0, Math.floor((e - 4 * s) / STEP));
    const hi = Math.min(n - 1, Math.ceil((e + 4 * s) / STEP));
    for (let i = lo; i <= hi; i++) I[i] += amp * Math.exp(-((E[i] - e) ** 2) / (2 * s * s));
  };

  for (const [el, c] of Object.entries(comp)) {
    const info = LINES[el];
    if (!info || !c) continue;
    for (const [line, e, rel] of info.lines) {
      if (e > E_MAX) continue;
      const amp = c * rel * response(e);
      addPeak(e, amp);
      peaks.push({ el, line, e, h: amp });
    }
  }
  // Tube scatter: Rayleigh (elastic) and a broader Compton hump just below it
  addPeak(20.216, 0.16 * response(20.2));
  addPeak(22.724, 0.035 * response(22.7));
  const cs = 0.4;
  for (let i = 0; i < n; i++) {
    const e = E[i];
    I[i] += 0.11 * Math.exp(-((e - 19.55) ** 2) / (2 * cs * cs));
    // bremsstrahlung continuum
    I[i] += 0.035 * response(e) * Math.exp(-((e - 14) ** 2) / (2 * 6.5 * 6.5));
  }
  // counting noise
  for (let i = 0; i < n; i++) {
    const v = I[i];
    I[i] = Math.max(0, v + (rand() - 0.5) * 0.012 * Math.sqrt(v + 0.02) + (rand() - 0.5) * 0.002);
  }
  let max = 0;
  for (let i = 0; i < n; i++) max = Math.max(max, I[i]);
  for (let i = 0; i < n; i++) I[i] /= max;
  for (const p of peaks) p.h /= max;
  return { E, I, peaks };
}

// All known lines within `tol` keV of an energy, for the hover read-out.
export function linesNear(e, tol = 0.18) {
  const out = [];
  for (const [el, info] of Object.entries(LINES)) {
    for (const [line, le] of info.lines) {
      if (Math.abs(le - e) <= tol) out.push({ el, line, e: le, name: info.name });
    }
  }
  return out.sort((a, b) => Math.abs(a.e - e) - Math.abs(b.e - e));
}
