// The dial: a non-linear slider through 42,000 years, dotted with every
// pigment arrival (filled dot) and disappearance (hollow dot).
import { h } from './store.js';
import { yearToT, tToYear, roundYear, formatYear, eventsFor, ERAS, MIN_YEAR, MAX_YEAR } from './time.js';

const RES = 2000;
const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export function mountTimeline(host, store, { pigments, milestones }) {
  const ticks = h('div', { class: 'tl-ticks', 'aria-hidden': 'true' });
  const fill = h('div', { class: 'tl-fill', 'aria-hidden': 'true' });
  const range = h('input', {
    class: 'tl-range', type: 'range', min: 0, max: RES, step: 1,
    'aria-label': 'Year. Page Up and Page Down jump between pigment arrivals.',
  });
  const eras = h('div', { class: 'tl-eras', 'aria-hidden': 'true' },
    ERAS.map((e, i) => h('span', { class: `tl-era${i === 1 || i === 2 || i === 4 ? ' minor' : ''}`, style: { left: `${yearToT(e.from) * 100}%` } }, e.short)));
  const prevBtn = h('button', { type: 'button', class: 'tl-btn' }, 'Previous change');
  const nextBtn = h('button', { type: 'button', class: 'tl-btn' }, 'Next change');
  const playBtn = h('button', { type: 'button', class: 'tl-btn', 'aria-pressed': 'false' }, 'Play history');
  const eventText = h('span', { class: 'tl-event', 'aria-live': 'polite' });

  host.replaceChildren(
    h('div', { class: 'timeline' },
      h('div', { class: 'tl-rail' }, h('div', { class: 'tl-track' }), fill, ticks, range),
      eras,
      h('div', { class: 'tl-bar' }, prevBtn, playBtn, nextBtn, eventText)
    )
  );

  let events = [];
  function drawTicks(region) {
    events = eventsFor(pigments, region);
    const rows = [-1, -1, -1];
    const nodes = [];
    for (const ev of events) {
      const t = yearToT(ev.year) * 100;
      let row = rows.findIndex((last) => t - last > 0.9);
      if (row < 0) row = 2;
      rows[row] = t;
      nodes.push(h('span', {
        class: `tl-tick ${ev.type === 'loss' ? 'loss' : ''} ${row ? `stack-${row}` : ''}`,
        style: { left: `${t}%` }, '--c': ev.pigment.hex,
      }));
    }
    for (const m of milestones) nodes.push(h('span', { class: 'tl-tick milestone', style: { left: `${yearToT(m.year) * 100}%` }, title: m.label }));
    ticks.replaceChildren(...nodes);
  }

  function describe(year) {
    const past = events.filter((e) => e.year <= year);
    const last = past[past.length - 1];
    const ms = milestones.filter((m) => m.year <= year && m.year > (last ? last.year : -Infinity)).pop();
    if (ms) return `${formatYear(ms.year)}: ${ms.label}`;
    if (!last) return 'Earth pigments and soot: the oldest palette.';
    return `${formatYear(last.year)}: ${last.pigment.name} ${last.type === 'arrival' ? 'arrives' : 'falls out of use'}`;
  }

  let local = false; // true while this slider is the source of the change
  function render(state) {
    const v = Math.round(yearToT(state.year) * RES);
    if (!local) range.value = v;
    range.setAttribute('aria-valuetext', formatYear(state.year));
    fill.style.width = `${(Number(range.value) / RES) * 100}%`;
    eventText.textContent = describe(state.year);
  }

  range.addEventListener('input', () => {
    stop();
    const y = roundYear(tToYear(Number(range.value) / RES));
    local = true;
    if (y !== store.get().year) store.set({ year: y });
    else render(store.get());
    local = false;
  });
  const jump = (dir) => {
    stop();
    const y = store.get().year;
    const list = [...new Set(events.map((e) => e.year).concat(milestones.map((m) => m.year)))].sort((a, b) => a - b);
    const target = dir > 0 ? list.find((e) => e > y) : [...list].reverse().find((e) => e < y);
    if (target != null) store.set({ year: target });
  };
  range.addEventListener('keydown', (e) => {
    if (e.key === 'PageUp') { e.preventDefault(); jump(1); }
    if (e.key === 'PageDown') { e.preventDefault(); jump(-1); }
  });
  prevBtn.addEventListener('click', () => jump(-1));
  nextBtn.addEventListener('click', () => jump(1));

  // Play: glide along the dial (or hop event to event with reduced motion)
  let raf = 0;
  let timer = 0;
  function stop() {
    cancelAnimationFrame(raf);
    clearInterval(timer);
    raf = 0;
    timer = 0;
    playBtn.setAttribute('aria-pressed', 'false');
    playBtn.textContent = 'Play history';
    if (store.get().playing) store.set({ playing: false });
  }
  function play() {
    if (store.get().year >= MAX_YEAR - 1) store.set({ year: MIN_YEAR });
    playBtn.setAttribute('aria-pressed', 'true');
    playBtn.textContent = 'Pause';
    store.set({ playing: true });
    if (reduceMotion()) {
      timer = setInterval(() => {
        const y = store.get().year;
        const next = events.map((e) => e.year).find((e) => e > y);
        if (next == null) return stop();
        store.set({ year: next });
      }, 900);
      return;
    }
    let last = performance.now();
    const step = (now) => {
      const dt = Math.min(64, now - last);
      last = now;
      const t = yearToT(store.get().year) + dt / 16000; // whole history in ~16 s
      if (t >= 1) {
        store.set({ year: MAX_YEAR });
        return stop();
      }
      store.set({ year: roundYear(tToYear(t)) });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  playBtn.addEventListener('click', () => (playBtn.getAttribute('aria-pressed') === 'true' ? stop() : play()));

  drawTicks(store.get().region);
  render(store.get());
  store.subscribe((s, prev) => {
    if (s.region !== prev.region) drawTicks(s.region);
    if (s.year !== prev.year || s.region !== prev.region) render(s);
    if (s.view !== prev.view && (raf || timer)) stop();
  });
  return { stop };
}
