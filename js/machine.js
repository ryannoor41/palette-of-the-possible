// Time Machine: repaint an image with only the pigments available in a year.
import { h, svg, bind, pct, showTip, hideTip } from './store.js';
import { availableAt, paletteKey, formatYear, yearToT, tToYear, eventsFor, MIN_YEAR, MAX_YEAR, ERAS, statusAt } from './time.js';
import { reachable, hull2d, polygonArea } from './gamut.js';
import { openPigment } from './drawer.js';
import { searchAIC } from './aic.js';
import { rgbToHex } from './color.js';

const MAX_SIDE = 960;
const CACHE_LIMIT = 8;

export function mountMachine(root, store, { pigments, paintings }) {
  const el = (n) => bind(root, n);
  const cvO = el('cv-original');
  const cvP = el('cv-period');
  const cvM = el('cv-missing');
  const frame = el('frame');
  const split = el('split');
  const splitLine = el('split-line');
  const busy = el('busy');
  const worker = new Worker(new URL('./mixer-worker.js', import.meta.url));

  let current = null; // { key, title, year, painting? }
  let reqId = 0;
  let inFlight = null; // palette key being computed
  let wanted = null; // { key, msg }
  const results = new Map(); // imageKey|paletteKey -> result
  const sets = new Map(); // paletteKey -> reachable set
  let mode = 'split';

  const setFor = (pigs) => {
    const key = paletteKey(pigs);
    if (!sets.has(key)) sets.set(key, reachable(pigs));
    return { key, set: sets.get(key) };
  };
  const currentPalette = () => {
    const s = store.get();
    return availableAt(pigments, s.year, s.region, { modestPatron: !s.patron });
  };

  // ---------------- image loading ----------------
  function loadImage(src, cors) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      if (cors) img.crossOrigin = 'anonymous';
      img.decoding = 'async';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('The image could not be loaded.'));
      img.src = src;
    });
  }

  async function useImage(src, meta, cors = false) {
    busy.hidden = false;
    let img;
    try {
      img = await loadImage(src, cors);
    } catch (e) {
      busy.hidden = true;
      el('caption').textContent = `${e.message} Try another image.`;
      return false;
    }
    const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const hgt = Math.max(1, Math.round(img.naturalHeight * scale));
    for (const c of [cvO, cvP, cvM]) {
      c.width = w;
      c.height = hgt;
    }
    const ctx = cvO.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, w, hgt);
    let data;
    try {
      data = ctx.getImageData(0, 0, w, hgt);
    } catch {
      busy.hidden = true;
      el('caption').textContent = "This museum's image server does not let web pages read its pixels, so it can't be repainted. Try another work, or download it and use \"Your own image\".";
      return false;
    }
    cvP.getContext('2d').drawImage(img, 0, 0, w, hgt);
    current = { ...meta, key: `${meta.key}#${w}x${hgt}` };
    worker.postMessage({ type: 'image', key: current.key, w, h: hgt, data: data.data });
    renderNote();
    update(true);
    return true;
  }

  // ---------------- worker round trip ----------------
  function request(pigs) {
    const { key, set } = setFor(pigs);
    const rkey = `${current.key}|${key}`;
    if (results.has(rkey)) {
      show(results.get(rkey), pigs);
      wanted = null;
      return;
    }
    const n = set.ok.length;
    const ok = new Float32Array(n * 3);
    const rgb = new Uint8Array(n * 3);
    const recipe = new Int16Array(n * 4).fill(-1);
    for (let i = 0; i < n; i++) {
      ok.set(set.ok[i], i * 3);
      rgb[i * 3] = set.rgb[i][0];
      rgb[i * 3 + 1] = set.rgb[i][1];
      rgb[i * 3 + 2] = set.rgb[i][2];
      set.recipe[i].slice(0, 4).forEach((r, k) => (recipe[i * 4 + k] = r));
    }
    wanted = { rkey, pigs, imageKey: current.key, msg: { type: 'map', imageKey: current.key, ok, rgb, recipe, nPig: pigs.length } };
    pump();
  }
  function pump() {
    if (inFlight || !wanted) return;
    const job = wanted;
    wanted = null;
    inFlight = { ...job, id: ++reqId };
    busy.hidden = false;
    worker.postMessage({ ...job.msg, id: inFlight.id });
  }
  worker.onmessage = (e) => {
    const msg = e.data;
    if (!inFlight || msg.id !== inFlight.id) return;
    const job = inFlight;
    inFlight = null;
    if (msg.type === 'error') {
      busy.hidden = true;
      if (msg.message !== 'image not loaded') el('caption').textContent = `Something went wrong while mixing: ${msg.message}`;
      pump();
      return;
    }
    const res = { w: msg.w, h: msg.h, out: new ImageData(msg.out, msg.w, msg.h), missing: new ImageData(msg.missing, msg.w, msg.h), stats: msg.stats };
    results.set(job.rkey, res);
    if (results.size > CACHE_LIMIT) results.delete(results.keys().next().value);
    if (!wanted && current && job.imageKey === current.key) show(res, job.pigs);
    pump();
    if (!inFlight) busy.hidden = true;
  };

  // ---------------- display ----------------
  function show(res, pigs) {
    if (!inFlight && !wanted) busy.hidden = true;
    if (cvP.width !== res.w || cvP.height !== res.h) return;
    cvP.getContext('2d').putImageData(res.out, 0, 0);
    cvM.getContext('2d').putImageData(res.missing, 0, 0);
    renderStats(res.stats, pigs);
  }

  function renderStats(stats, pigs) {
    const { year } = store.get();
    el('match-num').textContent = pct(stats.close);
    el('match-bar').style.width = pct(stats.close, 1);
    el('match-label').textContent = `of the picture can be matched closely with the pigments of ${formatYear(year)}`;

    const shop = pigs
      .map((p, i) => ({ p, u: stats.usage[i] || 0 }))
      .filter((x) => x.u >= 0.005)
      .sort((a, b) => b.u - a.u)
      .slice(0, 8);
    el('shopping').replaceChildren(
      ...shop.map(({ p, u }) =>
        h('li', {},
          h('span', { class: 'dot', '--c': p.hex, 'aria-hidden': 'true' }),
          h('button', { type: 'button', onclick: () => openPigment(p, store, pigments) }, p.name),
          h('span', { class: 'share' }, `${Math.round(u * 100)}%`)
        )
      )
    );

    const miss = stats.missingColours.filter((m) => m.share >= 0.01);
    el('missing-note').textContent = miss.length
      ? `Colours in the original with no close match in ${formatYear(year)}, with their share of the picture:`
      : `Nothing significant: in ${formatYear(year)} this palette can mix every important colour in the picture.`;
    el('missing-swatches').replaceChildren(
      ...miss.map((m) => h('li', { title: rgbToHex(m.rgb) }, h('span', { '--c': rgbToHex(m.rgb) }), h('small', {}, m.share < 0.01 ? '<1%' : pct(m.share))))
    );
  }

  function renderPaletteChips(pigs) {
    el('palette-chips').replaceChildren(
      ...pigs.map((p) => h('li', {}, h('button', { type: 'button', onclick: () => openPigment(p, store, pigments) }, h('span', { class: 'dot', '--c': p.hex, 'aria-hidden': 'true' }), p.short || p.name)))
    );
  }

  function renderCaption() {
    if (!current) return;
    const { year } = store.get();
    el('tag-left').textContent = `Pigments of ${formatYear(year)}`;
    el('tag-right').textContent = current.year ? `As painted, ${current.yearLabel || formatYear(current.year)}` : 'Original';
    let text;
    if (mode === 'missing') text = `Grey areas could be mixed in ${formatYear(year)}; areas still in colour could not.`;
    else if (current.year && year >= current.year) text = `The dial is at or after this work's own date, so the period palette should match closely. Any gap shows the limits of this simulation.`;
    else if (current.year) text = `${current.title} imagined with only the pigments of ${formatYear(year)}, ${(current.year - year).toLocaleString('en-US')} years before it was made. Drag across the picture to compare.`;
    else text = `${current.title} repainted with only the pigments of ${formatYear(year)}. Drag across the picture to compare.`;
    el('caption').textContent = text;
  }

  function setSplit(v) {
    split.value = v;
    const p = Number(v);
    cvP.style.clipPath = mode === 'split' ? `inset(0 ${100 - p}% 0 0)` : 'none';
    splitLine.style.left = `${p}%`;
  }

  function setMode(m) {
    mode = m;
    root.querySelectorAll('[data-control="mode"] button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.value === m)));
    cvM.hidden = m !== 'missing';
    cvP.hidden = m === 'missing';
    splitLine.hidden = m !== 'split';
    split.hidden = m !== 'split';
    el('tag-right').hidden = m !== 'split';
    el('tag-left').textContent = m === 'missing' ? 'Out of reach' : `Pigments of ${formatYear(store.get().year)}`;
    frame.style.cursor = m === 'split' ? 'ew-resize' : 'default';
    setSplit(split.value);
    renderCaption();
  }

  let lastKey = '';
  function update(force = false) {
    const pigs = currentPalette();
    const key = paletteKey(pigs);
    renderCaption();
    if (!force && key === lastKey) return;
    lastKey = key;
    renderPaletteChips(pigs);
    if (current) request(pigs);
    drawDisc(pigs);
  }

  // ---------------- gamut charts ----------------
  const disc = el('gamut-disc');
  const timeHost = el('gamut-time');
  let modernHull = null;
  let series = null;
  let seriesKey = '';

  function hullFor(pigs) {
    const { set } = setFor(pigs);
    const hull = hull2d(set.ok);
    return { hull, area: polygonArea(hull), set };
  }

  const R = 0.31;
  const DS = 300;
  const toX = (a) => DS / 2 + (a / R) * (DS / 2 - 16);
  const toY = (b) => DS / 2 - (b / R) * (DS / 2 - 16);
  function drawDisc(pigs) {
    const s = store.get();
    if (!modernHull) modernHull = hullFor(availableAt(pigments, MAX_YEAR, 'world')).hull;
    const { hull, set } = hullFor(pigs);
    const stride = Math.max(1, Math.floor(set.ok.length / 1600));
    const dots = [];
    for (let i = 0; i < set.ok.length; i += stride) {
      const o = set.ok[i];
      dots.push(svg('circle', { cx: toX(o[1]).toFixed(1), cy: toY(o[2]).toFixed(1), r: 2.6, fill: rgbToHex(set.rgb[i]) }));
    }
    const poly = (pts) => pts.map(([a, b]) => `${toX(a).toFixed(1)},${toY(b).toFixed(1)}`).join(' ');
    disc.replaceChildren(
      svg('svg', { viewBox: `0 0 ${DS} ${DS}`, role: 'img', 'aria-label': `Mixable colours in ${formatYear(s.year)}: ${set.ok.length} distinct mixtures from ${pigs.length} pigments.` },
        svg('line', { class: 'gridline', x1: 8, x2: DS - 8, y1: DS / 2, y2: DS / 2 }),
        svg('line', { class: 'gridline', y1: 8, y2: DS - 8, x1: DS / 2, x2: DS / 2 }),
        svg('polygon', { points: poly(modernHull), fill: 'none', stroke: '#a9a69e', 'stroke-width': 1 }),
        svg('g', {}, dots),
        svg('polygon', { points: poly(hull), fill: 'none', stroke: '#26282c', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }),
        svg('text', { class: 'chart-label', x: DS - 10, y: DS / 2 - 6, 'text-anchor': 'end', text: 'reds' }),
        svg('text', { class: 'chart-label', x: 10, y: DS / 2 - 6, text: 'greens' }),
        svg('text', { class: 'chart-label', x: DS / 2 + 6, y: 16, text: 'yellows' }),
        svg('text', { class: 'chart-label', x: DS / 2 + 6, y: DS - 8, text: 'blues' }),
        (() => { const topV = modernHull.reduce((a, b) => (b[1] > a[1] ? b : a)); return svg('text', { class: 'chart-label halo', x: toX(topV[0]), y: toY(topV[1]) - 7, text: 'today', 'text-anchor': 'middle' }); })()
      )
    );
  }

  function computeSeries() {
    const s = store.get();
    const key = `${s.region}|${s.patron}`;
    if (key === seriesKey && series) return;
    seriesKey = key;
    const years = [MIN_YEAR, ...new Set(eventsFor(pigments, s.region).map((e) => e.year))].filter((y) => y <= MAX_YEAR).sort((a, b) => a - b);
    const todayArea = hullFor(availableAt(pigments, MAX_YEAR, s.region, { modestPatron: !s.patron })).area;
    const pts = [];
    let i = 0;
    const work = () => {
      if (seriesKey !== key) return; // settings changed mid-way
      const t0 = performance.now();
      while (i < years.length && performance.now() - t0 < 12) {
        const pigs = availableAt(pigments, years[i], s.region, { modestPatron: !s.patron });
        pts.push({ year: years[i], v: pigs.length > 2 ? hullFor(pigs).area / todayArea : 0, n: pigs.length });
        i++;
      }
      if (i < years.length) setTimeout(work, 0);
      else {
        series = pts;
        drawSeries();
      }
    };
    work();
  }

  const W = 640;
  const H = 250;
  const M = { l: 46, r: 14, t: 14, b: 34 };
  const sx = (y) => M.l + yearToT(y) * (W - M.l - M.r);
  let sy = (v) => v;
  function drawSeries() {
    if (!series) return;
    const { year } = store.get();
    const vmax = Math.max(1, ...series.map((p) => p.v));
    const top = Math.max(1.05, Math.ceil(vmax * 20) / 20);
    sy = (v) => H - M.b - (v / top) * (H - M.t - M.b);
    let d = '';
    series.forEach((p, i) => {
      const x = sx(p.year).toFixed(1);
      const y = sy(p.v).toFixed(1);
      d += i === 0 ? `M${x},${y}` : `H${x}V${y}`;
    });
    d += `H${sx(MAX_YEAR).toFixed(1)}`;
    const cur = valueAt(year);
    const grid = [];
    for (let v = 0; v <= 1 + 1e-9; v += 0.25) {
      grid.push(svg('line', { class: 'gridline', x1: M.l, x2: W - M.r, y1: sy(v), y2: sy(v) }));
      grid.push(svg('text', { class: 'chart-label', x: M.l - 8, y: sy(v) + 4, 'text-anchor': 'end', text: `${Math.round(v * 100)}%` }));
    }
    const xTicks = [[-40000, '40,000 BCE', 'start'], [500, '500 CE', 'middle'], [1400, '1400', 'middle'], [1800, '1800', 'middle'], [1900, '1900', 'middle'], [MAX_YEAR, 'today', 'end']];
    const eraTicks = xTicks.map(([y, label, anchor]) => svg('text', { class: 'chart-label', x: sx(y), y: H - 12, 'text-anchor': anchor, text: label }));
    const eraLines = ERAS.slice(1).map((e) => svg('line', { class: 'gridline', x1: sx(e.from), x2: sx(e.from), y1: M.t, y2: H - M.b }));
    const cross = svg('line', { class: 'crosshair', y1: M.t, y2: H - M.b, x1: -10, x2: -10, visibility: 'hidden' });
    const svgEl = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Step chart: share of today's mixable colour range reachable in each year. In ${formatYear(year)} it is ${pct(cur.v)}.` },
      grid, eraLines,
      svg('line', { class: 'axisline', x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b }),
      eraTicks,
      svg('path', { d, fill: 'none', stroke: '#26282c', 'stroke-width': 2, 'stroke-linejoin': 'round' }),
      svg('line', { x1: sx(year), x2: sx(year), y1: M.t, y2: H - M.b, stroke: '#2a3fa0', 'stroke-width': 1.5 }),
      svg('circle', { cx: sx(year), cy: sy(cur.v), r: 5, fill: '#2a3fa0', stroke: '#e4e3de', 'stroke-width': 2 }),
      svg('text', { class: 'chart-label halo', x: sx(year) > W - 140 ? sx(year) - 8 : sx(year) + 8, y: Math.max(M.t + 10, sy(cur.v) - 10), 'text-anchor': sx(year) > W - 140 ? 'end' : 'start', text: `${formatYear(year)}: ${pct(cur.v)}`, style: 'fill:#26282c;font-weight:600' }),
      cross,
      svg('rect', { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b, fill: 'transparent', style: 'cursor:pointer' })
    );
    const pick = (ev) => {
      const r = svgEl.getBoundingClientRect();
      const x = ((ev.clientX - r.left) / r.width) * W;
      const t = Math.max(0, Math.min(1, (x - M.l) / (W - M.l - M.r)));
      return { y: Math.round(tToYear(t)), x };
    };
    svgEl.addEventListener('pointermove', (ev) => {
      const { y, x } = pick(ev);
      if (x < M.l) return;
      const p = valueAt(y);
      cross.setAttribute('x1', x);
      cross.setAttribute('x2', x);
      cross.setAttribute('visibility', 'visible');
      showTip(ev.clientX, ev.clientY, [h('strong', {}, pct(p.v)), h('br'), `of today's range in ${formatYear(y < -3000 ? Math.round(y / 500) * 500 : y)}`, h('br'), h('span', { class: 'muted' }, `${p.n} pigments on the shelf`)]);
    });
    svgEl.addEventListener('pointerleave', () => {
      cross.setAttribute('visibility', 'hidden');
      hideTip();
    });
    svgEl.addEventListener('click', (ev) => {
      const { y } = pick(ev);
      store.set({ year: y < -3000 ? Math.round(y / 500) * 500 : y });
    });
    timeHost.replaceChildren(svgEl);

    el('gamut-table').replaceChildren(
      h('table', {},
        h('thead', {}, h('tr', {}, h('th', {}, 'From'), h('th', {}, 'Pigments'), h('th', {}, "Share of today's range"))),
        h('tbody', {}, series.map((p) => h('tr', {}, h('td', {}, formatYear(p.year)), h('td', {}, String(p.n)), h('td', {}, pct(p.v)))))
      )
    );
  }
  function valueAt(y) {
    if (!series) return { v: 0, n: 0 };
    let p = series[0];
    for (const q of series) if (q.year <= y) p = q;
    return p;
  }

  // ---------------- painting note ----------------
  function renderNote() {
    const host = el('painting-note');
    const p = current?.painting;
    if (!p) {
      host.replaceChildren(...[
        h('h2', {}, current?.title || ''),
        current?.credit ? h('p', { class: 'meta' }, current.credit) : null,
        h('div', {}, h('p', {}, current?.credit
          ? 'Without a technical study we cannot know which pigments this work really contains, but the Time Machine can still show what a painter of any year could have mixed to match it.'
          : 'Try the dial on your own picture: the colours that stay vivid in "Show what\'s out of reach" are the ones no painter of that year could have mixed.')),
      ].filter(Boolean));
      renderAI();
      return;
    }
    const known = p.pigments.map((id) => pigments.find((q) => q.id === id)).filter(Boolean);
    host.replaceChildren(
      h('h2', {}, p.title),
      h('p', { class: 'meta' }, `${p.artist}, ${p.yearLabel}. ${p.museum}.`),
      h('div', {},
        h('h3', { class: 'side-h' }, "What's actually in it"),
        h('ul', { class: 'chips' }, known.map((q) => h('li', {}, h('button', { type: 'button', onclick: () => openPigment(q, store, pigments) }, h('span', { class: 'dot', '--c': q.hex, 'aria-hidden': 'true' }), q.short || q.name)))),
        p.pigmentNote ? h('p', { class: 'fine' }, p.pigmentNote) : null,
        h('button', { type: 'button', class: 'btn btn-quiet', onclick: () => store.set({ year: p.yearNum }) }, `Set the dial to ${p.yearNum}`)
      ),
      h('div', {},
        ...p.story.map((t) => h('p', {}, t)),
        h('p', { class: 'fine' }, 'Sources: ', ...p.sources.flatMap(([label, url], i) => [i ? '; ' : '', h('a', { href: url, target: '_blank', rel: 'noopener' }, label)]))
      )
    );
    renderAI();
  }

  // Optional: images generated offline with the course's Prodia proxy
  let aiManifest = null;
  fetch('img/ai/manifest.json').then((r) => (r.ok ? r.json() : null)).then((m) => { aiManifest = m; renderAI(); }).catch(() => {});
  function renderAI() {
    const host = el('ai-compare');
    const id = current?.painting?.id;
    const items = (aiManifest?.items || []).filter((x) => x.painting === id);
    if (!items.length) { host.hidden = true; return; }
    host.hidden = false;
    host.replaceChildren(
      h('h2', {}, 'The same question, asked of an image model'),
      h('p', { class: 'fine' }, `An image model was asked to repaint this work using only the pigments listed for a given year (${aiManifest.model || 'via the course Prodia proxy'}). Compare its guess with the colour-science result above: the model invents brushwork and drama, but it has no idea which colours were physically mixable.`),
      h('div', { class: 'ai-row' }, items.map((x) => h('figure', {},
        h('img', { src: `img/ai/${x.file}`, alt: `AI repainting of ${current.title} as if made in ${formatYear(x.year)}`, loading: 'lazy' }),
        h('figcaption', {}, `Asked for ${formatYear(x.year)}. `, h('button', { type: 'button', class: 'tl-btn', onclick: () => store.set({ year: x.year }) }, `Set the dial to ${formatYear(x.year)}`))
      )))
    );
  }

  // ---------------- chooser ----------------
  const gallery = el('gallery');
  function selectPainting(p, { scroll = false } = {}) {
    gallery.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.id === p.id)));
    useImage(`img/paintings/${p.id}.jpg`, { key: p.id, title: p.title, year: p.yearNum, yearLabel: p.yearLabel, painting: p });
    store.set({ painting: p.id });
    if (scroll) frame.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  gallery.replaceChildren(
    ...paintings.map((p) => h('li', {},
      h('button', { type: 'button', 'data-id': p.id, 'aria-pressed': 'false', onclick: () => selectPainting(p, { scroll: true }) },
        h('img', { src: `img/paintings/${p.id}-thumb.jpg`, alt: '', loading: 'lazy', width: 104, height: 104 }),
        h('span', { class: 'g-title' }, p.title),
        h('span', { class: 'g-date' }, `${p.by}, ${p.yearLabel}`)
      )))
  );

  // tabs
  const tabs = [...root.querySelectorAll('.chooser-tabs [role="tab"]')];
  tabs.forEach((t) => t.addEventListener('click', () => {
    tabs.forEach((x) => x.setAttribute('aria-selected', String(x === t)));
    root.querySelectorAll('.chooser-panel').forEach((pnl) => (pnl.hidden = pnl.dataset.panel !== t.dataset.tab));
  }));

  // upload + drag-and-drop
  const file = el('file');
  const dz = el('dropzone');
  const takeFile = (f) => {
    if (!f || !f.type.startsWith('image/')) return;
    const url = URL.createObjectURL(f);
    gallery.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
    useImage(url, { key: `upload-${f.name}-${f.size}`, title: 'Your image' }).finally(() => setTimeout(() => URL.revokeObjectURL(url), 2000));
  };
  file.addEventListener('change', () => takeFile(file.files[0]));
  dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('drag'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('drag'));
  dz.addEventListener('drop', (e) => { e.preventDefault(); dz.classList.remove('drag'); takeFile(e.dataTransfer.files[0]); });

  // Art Institute of Chicago search
  const aicForm = el('aic-form');
  const aicStatus = el('aic-status');
  const aicResults = el('aic-results');
  aicForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = el('aic-q').value.trim();
    if (!q) return;
    aicStatus.textContent = 'Searching…';
    aicResults.replaceChildren();
    try {
      const items = await searchAIC(q);
      aicStatus.textContent = items.length ? `${items.length} public-domain works found. Choose one to load it.` : 'No public-domain works with images matched. Try an artist or a style.';
      aicResults.replaceChildren(...items.map((it) => h('li', {},
        h('button', { type: 'button', onclick: async () => {
          gallery.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', 'false'));
          const ok = await useImage(it.image, { key: `aic-${it.id}`, title: it.title, year: it.year, yearLabel: it.dateDisplay, credit: `${it.artist}, ${it.dateDisplay}. Art Institute of Chicago, public domain.` }, true);
          if (ok) frame.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } },
          h('img', { src: it.thumb, alt: '', loading: 'lazy', width: 104, height: 104 }),
          h('span', { class: 'g-title' }, it.title),
          h('span', { class: 'g-date' }, it.dateDisplay)
        ))));
    } catch {
      aicStatus.textContent = "The Art Institute's search didn't respond. Check your connection and try again.";
    }
  });

  // compare slider + direct dragging on the picture
  split.addEventListener('input', () => setSplit(split.value));
  let draggingFrame = false;
  const fromPointer = (e) => {
    const r = frame.getBoundingClientRect();
    setSplit(Math.round(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * 100));
  };
  frame.addEventListener('pointerdown', (e) => {
    if (mode !== 'split') return;
    draggingFrame = true;
    frame.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  frame.addEventListener('pointermove', (e) => draggingFrame && fromPointer(e));
  frame.addEventListener('pointerup', () => (draggingFrame = false));

  root.querySelectorAll('[data-control="mode"] button').forEach((b) => b.addEventListener('click', () => setMode(b.dataset.value)));

  // ---------------- wiring ----------------
  setMode('split');
  store.subscribe((s, prev) => {
    if (s.year !== prev.year || s.region !== prev.region || s.patron !== prev.patron) {
      update();
      if (s.region !== prev.region || s.patron !== prev.patron) computeSeries();
      else drawSeries();
    }
  });

  let started = false;
  return {
    activate(paintingId) {
      if (!started) {
        started = true;
        computeSeries();
        update(true);
      }
      const p = paintings.find((x) => x.id === paintingId) || (current ? null : paintings.find((x) => x.id === 'starry-night'));
      if (p && (!current || current.painting?.id !== p.id)) selectPainting(p);
    },
  };
}
