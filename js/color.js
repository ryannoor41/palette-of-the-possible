// Colour science helpers: sRGB <-> linear RGB <-> OKLab, and a three-band
// Kubelka–Munk pigment-mixing model. Shared by the main thread and the worker.

export function hexToRgb(hex) {
  const h = hex.replace('#', '');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

export function rgbToHex([r, g, b]) {
  const c = (v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return '#' + c(r) + c(g) + c(b);
}

// sRGB transfer function, channel 0..1
export function toLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
export function fromLinear(c) {
  const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
  return Math.max(0, Math.min(1, v));
}

export function hexToLinear(hex) {
  return hexToRgb(hex).map((v) => toLinear(v / 255));
}
export function linearToRgb255(lin) {
  return lin.map((v) => fromLinear(v) * 255);
}

// OKLab (Björn Ottosson, 2020) from linear sRGB
export function linearToOklab(r, g, b) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

export function hexToOklab(hex) {
  const [r, g, b] = hexToLinear(hex);
  return linearToOklab(r, g, b);
}

// ---------------------------------------------------------------------------
// Kubelka–Munk mixing, single-constant form, evaluated per RGB band.
// A pigment's masstone reflectance R gives K/S = (1-R)^2 / 2R. Mixtures add
// K/S in proportion to (amount x tinting strength); reflectance is recovered
// with R = 1 + K/S - sqrt((K/S)^2 + 2 K/S). Three bands are a coarse stand-in
// for a full reflectance spectrum, but they reproduce the key behaviour of
// paint: mixing is subtractive and darkening, and strong pigments dominate.
// ---------------------------------------------------------------------------
const EPS = 0.002;
export function ksFromLinear(lin) {
  return lin.map((R) => {
    const r = Math.min(1 - EPS, Math.max(EPS, R));
    return ((1 - r) * (1 - r)) / (2 * r);
  });
}
function rFromKs(ks) {
  return 1 + ks - Math.sqrt(ks * ks + 2 * ks);
}

// parts: array of [pigment, amount]; pigment has .ks (3) and .T (strength)
export function kmMix(parts) {
  let w = 0;
  const acc = [0, 0, 0];
  for (const [p, amount] of parts) {
    const c = amount * (p.T ?? 1);
    w += c;
    acc[0] += c * p.ks[0];
    acc[1] += c * p.ks[1];
    acc[2] += c * p.ks[2];
  }
  return [rFromKs(acc[0] / w), rFromKs(acc[1] / w), rFromKs(acc[2] / w)];
}

export function oklabDistance(a, b, lw = 1.4) {
  const dl = (a[0] - b[0]) * lw;
  const da = a[1] - b[1];
  const db = a[2] - b[2];
  return Math.sqrt(dl * dl + da * da + db * db);
}
