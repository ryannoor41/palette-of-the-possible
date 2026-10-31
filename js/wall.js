// The Wall: a cabinet of pigment jars, shelved by the era each first appears.
import { h, bind } from './store.js';
import { statusAt, spanFor, formatYear, yearParts, ERAS, eventsFor } from './time.js';
import { openPigment } from './drawer.js';

function hash(s) {
  let x = 2166136261;
  for (const c of s) x = Math.imul(x ^ c.charCodeAt(0), 16777619);
  return (x >>> 0) / 4294967296;
}

const REGION_WORDS = {
  eu: (y, n, N) => `In ${formatYear(y)}, a painter in Europe could obtain ${n} of the ${N} pigments on this wall.`,
  world: (y, n, N) => `In ${formatYear(y)}, painters somewhere on Earth were using ${n} of the ${N} pigments on this wall.`,
};

export function mountWall(root, store, pigments) {
  const cabinet = bind(root, 'cabinet');
  const jars = new Map();
  const ordered = [...pigments].sort((a, b) => a.world[0] - b.world[0] || a.name.localeCompare(b.name));
  ordered.forEach((p, i) => (p.no = i + 1));

  for (const era of ERAS) {
    const members = ordered.filter((p) => p.world[0] >= era.from && p.world[0] <= era.to);
    if (!members.length) continue;
    const range = era.from < -3000 ? 'before 3000 BCE' : era.to >= 2000 ? 'since 1900' : `${formatYear(era.from)} to ${formatYear(era.to + 1)}`;
    const row = h('ul', { class: 'shelf-row' });
    for (const p of members) {
      const level = 0.5 + hash(p.id) * 0.32;
      const jar = h('button', {
        type: 'button', class: 'jar', '--pig': p.hex,
        onclick: () => openPigment(p, store, pigments),
      },
        h('span', { class: 'jar-lid' }),
        h('span', { class: 'jar-body' }, h('span', { class: 'jar-powder' })),
        h('span', { class: 'jar-label' },
          h('span', { class: 'no' }, `No. ${p.no}`),
          h('span', { class: 'nm' }, p.short || p.name),
          h('span', { class: 'date' }, p.dateLabel)
        )
      );
      jars.set(p.id, { el: jar, p, level });
      row.append(h('li', {}, jar));
    }
    cabinet.append(
      h('section', { class: 'shelf', 'aria-label': `${era.name}, ${range}` },
        h('div', { class: 'shelf-head' }, h('h2', { class: 'shelf-name' }, era.name), h('span', { class: 'shelf-dates' }, range)),
        row
      )
    );
  }

  const line = bind(root, 'hero-line');
  const sub = bind(root, 'hero-sub');

  function render(state) {
    const { year, region } = state;
    let n = 0;
    for (const { el, p, level } of jars.values()) {
      const st = statusAt(p, year, region);
      el.dataset.status = st;
      el.style.setProperty('--lvl', st === 'available' ? level.toFixed(3) : '0');
      if (st === 'available') n++;
      const s = spanFor(p, region);
      const when = {
        available: `available in ${formatYear(year)}`,
        future: s ? `not yet available; arrives ${formatYear(s[0])}` : '',
        lost: s && s[1] != null ? `no longer in use after ${formatYear(s[1])}` : 'no longer in use',
        never: 'not used by European painters before modern times',
      }[st];
      el.setAttribute('aria-label', `No. ${p.no}, ${p.name}: ${when}`);
    }
    line.textContent = REGION_WORDS[region](year, n, pigments.length);

    const ev = eventsFor(pigments, region);
    const past = ev.filter((e) => e.year <= year && e.type === 'arrival');
    const next = ev.find((e) => e.year > year && e.type === 'arrival');
    const latest = past[past.length - 1];
    const parts = [];
    if (latest) parts.push(`Newest on the shelf: ${latest.pigment.name} (${formatYear(latest.year)}).`);
    else parts.push('Only earth colours and soot so far.');
    if (next) parts.push(`Next to arrive: ${next.pigment.name}, in ${formatYear(next.year)}.`);
    else parts.push('Every jar on this wall has now arrived.');
    sub.textContent = parts.join(' ');

    for (const { el } of jars.values()) el.classList.remove('is-new');
    if (latest && year - latest.year < 30 && latest.year > -3000) jars.get(latest.pigment.id)?.el.classList.add('is-new');
  }

  render(store.get());
  store.subscribe((s, prev) => {
    if (s.year !== prev.year || s.region !== prev.region) render(s);
  });
}

// Big numerals, shared by every view that shows one
export function bindYearNumerals(store) {
  const nums = [...document.querySelectorAll('[data-bind="year-num"]')];
  const eras = [...document.querySelectorAll('[data-bind="year-era"]')];
  const render = ({ year }) => {
    const { num, era } = yearParts(year);
    nums.forEach((n) => (n.textContent = num));
    eras.forEach((e) => (e.textContent = era));
  };
  render(store.get());
  store.subscribe((s, prev) => s.year !== prev.year && render(s));
}
