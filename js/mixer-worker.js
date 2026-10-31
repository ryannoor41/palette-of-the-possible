// Web Worker: repaints an image using only the colours a palette can mix.
//
// 1. The reachable colours (precomputed on the main thread with the
//    Kubelka–Munk model) are bucketed in a 3-D grid over OKLab.
// 2. A 33x33x33 lookup table maps every sRGB lattice point to its nearest
//    reachable colour (perceptual distance, lightness weighted).
// 3. Each pixel is mapped through the table with trilinear interpolation.
// 4. Statistics: how much of the image is matched closely, which pigments do
//    the work, and which colours are out of reach.

const LW = 1.4; // lightness weight: value structure matters most to painters
const N = 33; // LUT lattice size per axis
const CELL = 0.05;
const GX = Math.ceil((1.0 * LW) / CELL) + 2;
const GY = Math.ceil(1.0 / CELL) + 2;
const GZ = GY;

let image = null; // { key, w, h, data: Uint8ClampedArray, ok: Float32Array }

function toLinear(c) {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
const LIN = new Float32Array(256);
for (let i = 0; i < 256; i++) LIN[i] = toLinear(i / 255);

function oklab(r, g, b, out, o) {
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  out[o] = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  out[o + 1] = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  out[o + 2] = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
}

function setImage(msg) {
  const { key, w, h, data } = msg;
  const ok = new Float32Array(w * h * 3);
  for (let i = 0, p = 0; i < w * h; i++, p += 4) oklab(LIN[data[p]], LIN[data[p + 1]], LIN[data[p + 2]], ok, i * 3);
  image = { key, w, h, data, ok };
}

function buildGrid(ok, n) {
  const cellOf = (i) => {
    const x = Math.min(GX - 1, Math.max(0, Math.floor((ok[i * 3] * LW) / CELL)));
    const y = Math.min(GY - 1, Math.max(0, Math.floor((ok[i * 3 + 1] + 0.5) / CELL)));
    const z = Math.min(GZ - 1, Math.max(0, Math.floor((ok[i * 3 + 2] + 0.5) / CELL)));
    return (x * GY + y) * GZ + z;
  };
  const counts = new Int32Array(GX * GY * GZ + 1);
  const cells = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    cells[i] = cellOf(i);
    counts[cells[i] + 1]++;
  }
  for (let c = 1; c < counts.length; c++) counts[c] += counts[c - 1];
  const fill = counts.slice();
  const items = new Int32Array(n);
  for (let i = 0; i < n; i++) items[fill[cells[i]]++] = i;
  return { start: counts, items };
}

function nearest(grid, ok, L, a, b) {
  const qx = L * LW;
  const cx = Math.min(GX - 1, Math.max(0, Math.floor(qx / CELL)));
  const cy = Math.min(GY - 1, Math.max(0, Math.floor((a + 0.5) / CELL)));
  const cz = Math.min(GZ - 1, Math.max(0, Math.floor((b + 0.5) / CELL)));
  let best = -1;
  let bestD = Infinity;
  const maxR = Math.max(GX, GY, GZ);
  for (let R = 0; R <= maxR; R++) {
    for (let dx = -R; dx <= R; dx++) {
      const x = cx + dx;
      if (x < 0 || x >= GX) continue;
      for (let dy = -R; dy <= R; dy++) {
        const y = cy + dy;
        if (y < 0 || y >= GY) continue;
        const onShellXY = Math.abs(dx) === R || Math.abs(dy) === R;
        for (let dz = -R; dz <= R; dz++) {
          if (!onShellXY && Math.abs(dz) !== R) continue;
          const z = cz + dz;
          if (z < 0 || z >= GZ) continue;
          const c = (x * GY + y) * GZ + z;
          for (let k = grid.start[c]; k < grid.start[c + 1]; k++) {
            const i = grid.items[k];
            const dl = (ok[i * 3] - L) * LW;
            const da = ok[i * 3 + 1] - a;
            const db = ok[i * 3 + 2] - b;
            const d = dl * dl + da * da + db * db;
            if (d < bestD) {
              bestD = d;
              best = i;
            }
          }
        }
      }
    }
    if (best >= 0 && Math.sqrt(bestD) <= R * CELL) break;
  }
  return best;
}

function map(msg) {
  const { id, imageKey, ok, rgb, recipe, nPig } = msg;
  if (!image || image.key !== imageKey) {
    postMessage({ type: 'error', id, message: 'image not loaded' });
    return;
  }
  const n = ok.length / 3;
  const grid = buildGrid(ok, n);

  // LUT over the sRGB lattice
  const lut = new Int32Array(N * N * N);
  const tmp = new Float32Array(3);
  const step = 255 / (N - 1);
  for (let r = 0; r < N; r++) {
    for (let g = 0; g < N; g++) {
      for (let b = 0; b < N; b++) {
        oklab(toLinear((r * step) / 255), toLinear((g * step) / 255), toLinear((b * step) / 255), tmp, 0);
        lut[(r * N + g) * N + b] = nearest(grid, ok, tmp[0], tmp[1], tmp[2]);
      }
    }
  }

  const { w, h, data } = image;
  const out = new Uint8ClampedArray(w * h * 4);
  const missing = new Uint8ClampedArray(w * h * 4);
  const usage = new Float64Array(nPig);
  const bins = new Map();
  let close = 0;
  let sumDE = 0;
  const o = new Float32Array(3);
  const S = (N - 1) / 255;
  const de = new Float32Array(w * h);

  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    const R = data[p] * S;
    const G = data[p + 1] * S;
    const B = data[p + 2] * S;
    const r0 = Math.min(N - 2, Math.floor(R));
    const g0 = Math.min(N - 2, Math.floor(G));
    const b0 = Math.min(N - 2, Math.floor(B));
    const fr = R - r0;
    const fg = G - g0;
    const fb = B - b0;
    let cr = 0;
    let cg = 0;
    let cb = 0;
    for (let k = 0; k < 8; k++) {
      const dr = k & 4 ? 1 : 0;
      const dg = k & 2 ? 1 : 0;
      const db = k & 1 ? 1 : 0;
      const wgt = (dr ? fr : 1 - fr) * (dg ? fg : 1 - fg) * (db ? fb : 1 - fb);
      if (wgt === 0) continue;
      const e = lut[((r0 + dr) * N + (g0 + dg)) * N + (b0 + db)];
      cr += wgt * rgb[e * 3];
      cg += wgt * rgb[e * 3 + 1];
      cb += wgt * rgb[e * 3 + 2];
    }
    out[p] = cr;
    out[p + 1] = cg;
    out[p + 2] = cb;
    out[p + 3] = 255;

    // nearest lattice point decides which recipe gets the credit
    const en = lut[(Math.round(R) * N + Math.round(G)) * N + Math.round(B)];
    let cnt = 0;
    for (let k = 0; k < 4; k++) if (recipe[en * 4 + k] >= 0) cnt++;
    for (let k = 0; k < 4; k++) {
      const pi = recipe[en * 4 + k];
      if (pi >= 0) usage[pi] += 1 / cnt;
    }

    oklab(LIN[out[p]], LIN[out[p + 1]], LIN[out[p + 2]], o, 0);
    const dl = o[0] - image.ok[i * 3];
    const da = o[1] - image.ok[i * 3 + 1];
    const dbb = o[2] - image.ok[i * 3 + 2];
    const d = Math.sqrt(dl * dl + da * da + dbb * dbb);
    de[i] = d;
    sumDE += d;
    if (d < 0.04) close++;

    // "what's missing" view: original colour where unmatched, grey elsewhere
    const t = Math.max(0, Math.min(1, (d - 0.03) / 0.06));
    const m = t * t * (3 - 2 * t);
    const grey = 0.75 * (0.2126 * data[p] + 0.7152 * data[p + 1] + 0.0722 * data[p + 2]) + 0.25 * 236;
    missing[p] = grey + (data[p] - grey) * m;
    missing[p + 1] = grey + (data[p + 1] - grey) * m;
    missing[p + 2] = grey + (data[p + 2] - grey) * m;
    missing[p + 3] = 255;

    if (d > 0.07) {
      const key = ((data[p] >> 5) << 6) | ((data[p + 1] >> 5) << 3) | (data[p + 2] >> 5);
      let bin = bins.get(key);
      if (!bin) bins.set(key, (bin = { r: 0, g: 0, b: 0, n: 0, d: 0 }));
      bin.r += data[p];
      bin.g += data[p + 1];
      bin.b += data[p + 2];
      bin.n++;
      bin.d += d;
    }
  }

  const total = w * h;
  const missingColours = [...bins.values()]
    .map((b) => ({ rgb: [b.r / b.n, b.g / b.n, b.b / b.n], share: b.n / total, score: b.d }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  const usageArr = Array.from(usage, (u) => u / total);

  postMessage(
    {
      type: 'mapped',
      id,
      w,
      h,
      out,
      missing,
      stats: { close: close / total, meanDE: sumDE / total, usage: usageArr, missingColours },
    },
    [out.buffer, missing.buffer]
  );
}

self.onmessage = (e) => {
  const msg = e.data;
  try {
    if (msg.type === 'image') setImage(msg);
    else if (msg.type === 'map') map(msg);
  } catch (err) {
    postMessage({ type: 'error', id: msg.id, message: String(err && err.message ? err.message : err) });
  }
};
