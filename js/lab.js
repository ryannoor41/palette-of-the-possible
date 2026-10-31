// The Lab: real case files plus an endless "night shift" of generated ones.
import { h, svg, bind, showTip, hideTip } from './store.js';
import { simulate, linesNear, LINES, E_MAX } from './xrf.js';
import { statusAt, formatYear } from './time.js';
import { openPigment } from './drawer.js';

const store$ = {
  get(k, d) {
    try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; }
  },
  set(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* private mode: progress is not kept */ }
  },
};

// ---------------------------------------------------------------- spectrum
const W = 760;
const H = 290;
const M = { l: 42, r: 14, t: 26, b: 40 };
const X_MAX = 28;

function drawSpectrum(host, composition, { seed = 3, labels = true } = {}) {
  const { E, I, peaks } = simulate(composition, seed);
  const sx = (e) => M.l + (e / X_MAX) * (W - M.l - M.r);
  const sy = (v) => H - M.b - Math.sqrt(Math.max(0, v)) * (H - M.t - M.b);
  let d = '';
  for (let i = 0; i < E.length; i++) {
    if (E[i] > X_MAX) break;
    d += `${i ? 'L' : 'M'}${sx(E[i]).toFixed(1)},${sy(I[i]).toFixed(1)}`;
  }
  const area = `${d}L${sx(X_MAX)},${sy(0)}L${sx(0)},${sy(0)}Z`;

  // one label per element at its strongest visible line
  const best = new Map();
  for (const p of peaks) {
    if (p.e > X_MAX) continue;
    const cur = best.get(p.el);
    if (!cur || p.h > cur.h) best.set(p.el, p);
  }
  const placed = [];
  const labelNodes = [];
  [...best.values()].sort((a, b) => b.h - a.h).forEach((p) => {
    if (p.h < 0.03) return;
    const x = sx(p.e);
    let peakTop = 0;
    for (let i = Math.max(0, Math.round((p.e - 0.12) / 0.02)); i <= Math.round((p.e + 0.12) / 0.02) && i < I.length; i++) peakTop = Math.max(peakTop, I[i]);
    let y = sy(peakTop) - 7;
    while (placed.some((q) => Math.abs(q.x - x) < 24 && Math.abs(q.y - y) < 13)) y -= 13;
    placed.push({ x, y });
    const dim = p.el === 'Ar' || p.el === 'Rh';
    labelNodes.push(svg('text', { class: `peak-label halo-lab${dim ? ' dim' : ''}`, x, y: Math.max(10, y), 'text-anchor': 'middle', text: p.el === 'Ar' ? 'Ar' : p.el }));
  });
  labelNodes.push(svg('text', { class: 'peak-label dim', x: sx(20.2), y: sy(0.18) - 8, 'text-anchor': 'middle', text: 'tube scatter' }));

  const ticks = [];
  for (let e = 0; e <= X_MAX; e += 2) {
    ticks.push(svg('line', { class: 'gridline', x1: sx(e), x2: sx(e), y1: M.t, y2: H - M.b, opacity: 0.6 }));
    ticks.push(svg('text', { class: 'chart-label', x: sx(e), y: H - M.b + 16, 'text-anchor': 'middle', text: String(e) }));
  }
  const cross = svg('line', { class: 'crosshair', y1: M.t, y2: H - M.b, visibility: 'hidden' });
  const lab = svg('g', { visibility: labels ? 'visible' : 'hidden' }, labelNodes);
  const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': `Simulated X-ray fluorescence spectrum with peaks for ${[...best.keys()].filter((e) => e !== 'Ar').map((e) => LINES[e].name).join(', ')}.` },
    ticks,
    svg('line', { class: 'axisline', x1: M.l, x2: W - M.r, y1: H - M.b, y2: H - M.b }),
    svg('text', { class: 'chart-label', x: (W + M.l) / 2, y: H - 4, 'text-anchor': 'middle', text: 'Energy (keV)' }),
    svg('text', { class: 'chart-label', x: 12, y: (H - M.b + M.t) / 2, transform: `rotate(-90 12 ${(H - M.b + M.t) / 2})`, 'text-anchor': 'middle', text: 'Counts (√ scale)' }),
    svg('path', { class: 'spec-area', d: area }),
    svg('path', { class: 'spec-line', d }),
    lab,
    cross,
    svg('rect', { x: M.l, y: M.t, width: W - M.l - M.r, height: H - M.t - M.b, fill: 'transparent' })
  );
  s.addEventListener('pointermove', (ev) => {
    const r = s.getBoundingClientRect();
    const x = ((ev.clientX - r.left) / r.width) * W;
    const e = ((x - M.l) / (W - M.l - M.r)) * X_MAX;
    if (e < 0 || e > X_MAX) return;
    cross.setAttribute('x1', x);
    cross.setAttribute('x2', x);
    cross.setAttribute('visibility', 'visible');
    const near = linesNear(e, 0.16).slice(0, 4);
    showTip(ev.clientX, ev.clientY, [
      h('strong', {}, `${e.toFixed(2)} keV`),
      ...near.map((n) => [h('br'), `${n.el} ${n.line} ${n.e.toFixed(2)} `, h('span', { class: 'muted' }, n.name)]).flat(),
      near.length ? null : [h('br'), h('span', { class: 'muted' }, 'no emission line here')],
    ].flat());
  });
  s.addEventListener('pointerleave', () => {
    cross.setAttribute('visibility', 'hidden');
    hideTip();
  });
  host.replaceChildren(s);
  return { setLabels: (on) => lab.setAttribute('visibility', on ? 'visible' : 'hidden'), elements: [...best.keys()].filter((e) => e !== 'Ar') };
}

function spectrumFigure(title, note, composition, seed) {
  const host = h('div');
  const wrap = h('figure', { class: 'spectrum' });
  const toggle = h('input', { type: 'checkbox', checked: true });
  const head = h('div', { class: 'spectrum-head' },
    h('h3', { class: 'spectrum-title' }, title),
    h('label', { class: 'check' }, toggle, h('span', {}, 'Label the peaks'))
  );
  wrap.append(head, host);
  const ctl = drawSpectrum(host, composition, { seed });
  toggle.addEventListener('change', () => ctl.setLabels(toggle.checked));
  const els = ctl.elements.filter((e) => e !== 'Rh');
  wrap.append(h('figcaption', { class: 'fine' },
    note ? `${note} ` : '',
    'Hover to read energies. Ar is argon in the air; the hump near 20 keV is scatter from the instrument\'s rhodium tube. Elements detected: ',
    els.map((e, i) => [i ? ', ' : '', h('strong', {}, e), ` (${LINES[e].name.toLowerCase()})`]).flat(),
    '.'
  ));
  return wrap;
}

// ---------------------------------------------------------------- questions
function questionBlock(q, idx, onSolved) {
  const fb = h('p', { class: 'feedback', 'aria-live': 'polite' });
  const opts = h('div', { class: 'options' });
  let solved = false;
  q.options.forEach((o) => {
    const b = h('button', { type: 'button' }, o.sym ? h('span', { class: 'opt-sym' }, o.sym) : null, h('span', {}, o.label));
    b.addEventListener('click', () => {
      if (solved) return;
      b.classList.add(o.correct ? 'right' : 'wrong');
      fb.replaceChildren(h('span', { class: `verdict ${o.correct ? 'right' : 'wrong'}` }, o.correct ? 'Correct. ' : 'Not quite. '), o.feedback || '');
      if (o.correct) {
        solved = true;
        opts.querySelectorAll('button').forEach((x) => (x.disabled = true));
        onSolved();
      } else {
        b.disabled = true;
      }
    });
    opts.append(b);
  });
  return h('div', { class: 'question' }, h('h3', {}, `${idx + 1}. ${q.prompt}`), opts, fb);
}

// ---------------------------------------------------------------- night shift
const VISIBLE = new Set(['Pb', 'Hg', 'Cu', 'Fe', 'Mn', 'As', 'Sn', 'Sb', 'Co', 'Zn', 'Ti', 'Cr', 'Cd', 'Se', 'Br', 'Y', 'In', 'Ca']);
const GENRES = [
  { to: 1499, genres: ['A devotional panel of the Virgin and Child', 'A predella panel with the life of a saint', 'A small altarpiece wing'], schools: ['Sienese', 'Florentine', 'Flemish', 'Bohemian'] },
  { to: 1699, genres: ['A portrait of a merchant', 'A still life with lemons and a glass', 'A river landscape with cattle', 'A tavern interior'], schools: ['Venetian', 'Dutch', 'Flemish', 'Spanish'] },
  { to: 1799, genres: ['A fête galante in a park', 'A portrait of a lady in blue silk', 'A view of the Grand Canal', 'A hunting still life'], schools: ['French', 'English', 'Venetian'] },
  { to: 1879, genres: ['A storm at sea', 'A mountain gorge at dawn', 'A portrait of an officer', 'A village market'], schools: ['English', 'French', 'German'] },
  { to: 1919, genres: ['A garden in bloom', 'A harbour at dusk', 'A café interior', 'A haystack at sunset'], schools: ['French', 'Belgian', 'German Expressionist'] },
  { to: 2100, genres: ['An abstract composition', 'A city street at night', 'A still life with a guitar'], schools: ['Parisian', 'German', 'New York'] },
];

function mulberry32(seed) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function makeNightCase(pigments, seed) {
  const rand = mulberry32(seed);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const vis = (p) => p.elements.filter((e) => VISIBLE.has(e));
  // earliest European date of any pigment that contains an element
  const firstWith = (el) => pigments.filter((p) => p.eu && p.elements.includes(el)).sort((a, b) => a.eu[0] - b.eu[0])[0];
  const tpq = (el) => firstWith(el).eu[0];

  for (let attempt = 0; attempt < 40; attempt++) {
    const year = 1350 + Math.floor(rand() * 611);
    const avail = pigments.filter((p) => statusAt(p, year, 'eu') === 'available' && vis(p).length && p.role !== 'black');
    const whites = avail.filter((p) => p.role === 'white' && vis(p).length);
    const colours = avail.filter((p) => p.role !== 'white');
    if (!whites.length || colours.length < 4) continue;
    const chosen = new Set([pick(whites)]);
    const n = 3 + Math.floor(rand() * 3);
    let guard = 0;
    while (chosen.size < n + 1 && guard++ < 60) chosen.add(pick(colours));
    const forgery = rand() < 0.55;
    let culprit = null;
    let gun = null;
    if (forgery) {
      const present = new Set([...chosen].flatMap(vis));
      const options = [];
      for (const p of pigments) {
        if (!p.eu || p.eu[0] <= year + 40) continue;
        const els = vis(p).filter((e) => !present.has(e) && tpq(e) > year + 40);
        if (els.length) options.push({ p, els });
      }
      if (!options.length) continue;
      // forgers tend to slip in materials only a little too new: weight nearer anachronisms
      const weights = options.map((x) => 1 / Math.sqrt(x.p.eu[0] - year));
      let r = rand() * weights.reduce((a, b) => a + b, 0);
      const o = options.find((x, i) => (r -= weights[i]) <= 0) || options[options.length - 1];
      culprit = o.p;
      gun = pick(o.els);
      chosen.add(culprit);
    }
    const comp = { Ca: 0.15 + rand() * 0.15 };
    for (const p of chosen) {
      const w = p.role === 'white' ? 0.8 + rand() * 0.2 : 0.18 + rand() * 0.45;
      for (const e of vis(p)) comp[e] = Math.min(1, (comp[e] || 0) + w * (e === gun ? 0.9 : 1));
    }
    const era = GENRES.find((g) => year <= g.to);
    const elements = Object.keys(comp).sort((a, b) => LINES[a].Z - LINES[b].Z);
    const anachronistic = new Set(elements.filter((e) => e !== 'Ca' && tpq(e) > year));
    return {
      id: `night-${seed}`, seed, year, forgery, culprit, gun,
      chosen: [...chosen],
      title: `${pick(era.genres)}`,
      school: pick(era.schools),
      composition: comp,
      elements,
      anachronistic,
      tpq,
      firstWith,
    };
  }
  return null;
}

// ---------------------------------------------------------------- mount
export function mountLab(root, store, { cases, pigments }) {
  const list = bind(root, 'case-list');
  const article = bind(root, 'case');
  let solved = new Set(store$.get('pp-solved', []));
  let night = store$.get('pp-night', { streak: 0, best: 0, played: 0 });
  let current = null;

  function renderList() {
    list.replaceChildren(
      ...cases.map((c) => h('button', { type: 'button', 'aria-current': String(current === c.id), onclick: () => select(c.id) },
        h('span', { class: 'c-title' }, c.title),
        h('span', { class: 'c-meta' }, `Claimed: ${c.claimed}`, solved.has(c.id) ? h('span', { class: 'c-solved' }, '  Solved') : null)
      )),
      h('hr'),
      h('button', { type: 'button', 'aria-current': String(current === 'night'), onclick: () => select('night') },
        h('span', { class: 'c-title' }, 'Night shift'),
        h('span', { class: 'c-meta' }, `Endless generated cases. Best streak: ${night.best}`)
      )
    );
  }

  function select(id, { push = true } = {}) {
    current = id;
    renderList();
    if (id === 'night') renderNight();
    else renderCase(cases.find((c) => c.id === id));
    if (push && location.hash !== `#lab/${id}`) history.replaceState(null, '', `#lab/${id}`);
  }

  function renderCase(c) {
    const qHost = h('div');
    const reveal = h('section', { class: 'reveal', hidden: true },
      h('h3', {}, c.reveal.title),
      ...c.reveal.paragraphs.map((t) => h('p', {}, t)),
      h('p', {}, h('strong', {}, 'The lesson: '), c.reveal.lesson),
      h('p', { class: 'fine' }, 'Sources: ', ...c.sources.flatMap(([label, url], i) => [i ? '; ' : '', h('a', { href: url, target: '_blank', rel: 'noopener' }, label)]))
    );
    let step = 0;
    const next = () => {
      if (step < c.questions.length) {
        const qb = questionBlock(c.questions[step], step, () => {
          step++;
          setTimeout(next, 350);
        });
        qHost.append(qb);
        if (step > 0) qb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        reveal.hidden = false;
        solved.add(c.id);
        store$.set('pp-solved', [...solved]);
        renderList();
        reveal.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    };
    article.replaceChildren(
      h('h2', {}, c.title),
      h('dl', { class: 'case-meta' },
        h('dt', {}, 'Object'), h('dd', {}, c.object),
        h('dt', {}, 'Attributed to'), h('dd', {}, c.claimedBy),
        h('dt', {}, 'Claimed date'), h('dd', {}, c.claimed)
      ),
      h('p', { class: 'case-claim' }, c.claim),
      spectrumFigure('X-ray fluorescence', c.spectrumNote, c.composition, c.id.length * 7 + 1),
      h('ul', { class: 'notes', 'aria-label': 'Lab notes' }, c.notes.map(([k, v]) => h('li', {}, h('strong', {}, `${k}. `), v))),
      qHost,
      reveal
    );
    next();
  }

  function renderNight() {
    const seed = Math.floor(Math.random() * 1e9);
    const nc = makeNightCase(pigments, seed);
    if (!nc) return renderNight();
    const opts = [...nc.elements.filter((e) => e !== 'Ca').map((e) => ({ sym: e, label: LINES[e].name, e })), { sym: '–', label: `Nothing: everything fits ${formatYear(nc.year)}`, e: null }];
    const fb = h('div', { 'aria-live': 'polite' });
    const optHost = h('div', { class: 'options' });
    let answered = false;
    opts.forEach((o) => {
      const b = h('button', { type: 'button' }, h('span', { class: 'opt-sym' }, o.sym), h('span', {}, o.label));
      b.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        const right = o.e ? nc.anachronistic.has(o.e) : !nc.forgery;
        optHost.querySelectorAll('button').forEach((x) => (x.disabled = true));
        b.classList.add(right ? 'right' : 'wrong');
        opts.forEach((x, i) => {
          if (x.e ? nc.anachronistic.has(x.e) : !nc.forgery) optHost.children[i].classList.add('right');
        });
        night.played++;
        night.streak = right ? night.streak + 1 : 0;
        night.best = Math.max(night.best, night.streak);
        store$.set('pp-night', night);
        renderList();
        board.replaceChildren(...boardItems());
        fb.replaceChildren(explain(nc, right));
      });
      optHost.append(b);
    });
    const boardItems = () => [h('span', {}, 'Streak ', h('strong', {}, String(night.streak))), h('span', {}, 'Best ', h('strong', {}, String(night.best))), h('span', {}, 'Cases examined ', h('strong', {}, String(night.played)))];
    const board = h('p', { class: 'scoreboard' }, ...boardItems());
    article.replaceChildren(
      h('h2', {}, 'Night shift'),
      board,
      h('p', { class: 'case-claim' }, `${nc.title}, attributed to a ${nc.school} painter and dated ${formatYear(nc.year)}. The owner wants it authenticated before a sale. Read the spectrum: is there an element no painter could have used in ${formatYear(nc.year)}?`),
      h('dl', { class: 'case-meta' }, h('dt', {}, 'Claimed date'), h('dd', {}, formatYear(nc.year))),
      spectrumFigure('X-ray fluorescence', 'A generated case. Calcium comes from the chalk or gesso ground.', nc.composition, nc.seed % 997),
      h('div', { class: 'question' }, h('h3', {}, `Which element, if any, could not be in a painting of ${formatYear(nc.year)}?`), optHost, fb),
      h('p', {}, h('button', { type: 'button', class: 'btn', onclick: () => renderNight() }, 'Next case'))
    );
  }

  function explain(nc, right) {
    const rows = nc.elements.filter((e) => e !== 'Ca').map((e) => {
      const users = nc.chosen.filter((p) => p.elements.includes(e));
      const p = users.sort((a, b) => a.eu[0] - b.eu[0])[0];
      const bad = nc.anachronistic.has(e);
      return h('li', {},
        h('strong', {}, `${e}`), ` → `,
        h('button', { type: 'button', class: 'tl-btn', onclick: () => openPigment(p, store, pigments) }, p.name),
        bad ? `: introduced around ${formatYear(p.eu[0])}, long after ${formatYear(nc.year)}.` : `: available to European painters since ${p.eu[0] <= -3000 ? 'prehistory' : formatYear(p.eu[0])}.`
      );
    });
    return h('div', { class: 'feedback' },
      h('p', {}, h('span', { class: `verdict ${right ? 'right' : 'wrong'}` }, right ? 'Correct. ' : 'Not this time. '),
        nc.forgery
          ? `This is a forgery. The earliest pigment containing ${LINES[nc.gun].name.toLowerCase()} is ${nc.firstWith(nc.gun).name}, which reached European painters around ${formatYear(nc.tpq(nc.gun))}, so the picture can be no older than that.${nc.culprit !== nc.firstWith(nc.gun) ? ` (In this generated case the ${LINES[nc.gun].name.toLowerCase()} actually came from ${nc.culprit.name}, introduced around ${formatYear(nc.culprit.eu[0])}; Raman spectroscopy would tell the two apart.)` : ''}`
          : `Nothing here is out of place for ${formatYear(nc.year)}. That does not prove the painting is genuine, only that its materials do not rule it out.`),
      h('ul', { class: 'facts-list' }, rows),
      h('p', { class: 'fine' }, 'Generated cases simplify real analysis: they assume each element comes from one well-known pigment, and they leave out the organic pigments that XRF cannot see.')
    );
  }

  renderList();
  return {
    activate(arg) {
      const id = arg && (arg === 'night' || cases.some((c) => c.id === arg)) ? arg : current || cases[0].id;
      if (id !== current) select(id, { push: false });
    },
  };
}
