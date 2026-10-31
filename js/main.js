import { createStore, bind, h } from './store.js';
import { PIGMENTS } from './data/pigments.js';
import { PAINTINGS, MILESTONES } from './data/paintings.js';
import { CASES } from './data/cases.js';
import { mountTimeline } from './timeline.js';
import { mountWall, bindYearNumerals } from './wall.js';
import { mountMachine } from './machine.js';
import { mountLab } from './lab.js';
import { initDrawer } from './drawer.js';
import { renderAbout } from './about.js';

const store = createStore({ year: 1503, region: 'eu', patron: true, view: 'wall', painting: null, playing: false });

// ---- shared controls --------------------------------------------------------
document.querySelectorAll('[data-timeline]').forEach((host) => mountTimeline(host, store, { pigments: PIGMENTS, milestones: MILESTONES }));
bindYearNumerals(store);

function syncRegion({ region }) {
  document.querySelectorAll('[data-control="region"] button').forEach((b) => b.setAttribute('aria-checked', String(b.dataset.value === region)));
}
document.querySelectorAll('[data-control="region"] button').forEach((b) =>
  b.addEventListener('click', () => store.set({ region: b.dataset.value }))
);
// arrow keys move between radio buttons in segmented controls
document.querySelectorAll('.seg[role="radiogroup"]').forEach((g) => {
  g.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const btns = [...g.querySelectorAll('button')];
    const i = btns.indexOf(document.activeElement);
    if (i < 0) return;
    const n = btns[(i + (e.key === 'ArrowRight' ? 1 : btns.length - 1)) % btns.length];
    n.focus();
    n.click();
    e.preventDefault();
  });
});
const patron = document.querySelector('[data-control="patron"]');
patron.addEventListener('change', () => store.set({ patron: patron.checked }));

// "Visit a workshop" shortcuts
const PRESETS = [
  { label: 'A cave painter, 15,000 BCE', year: -15000, region: 'eu' },
  { label: 'An Egyptian tomb painter, 1320 BCE', year: -1320, region: 'world' },
  { label: 'A Roman fresco painter, 50 BCE', year: -50, region: 'eu' },
  { label: 'A medieval scribe, 1100', year: 1100, region: 'eu' },
  { label: 'Vermeer in Delft, 1665', year: 1665, region: 'eu' },
  { label: 'Van Gogh in Arles, 1888', year: 1888, region: 'eu' },
  { label: 'Today', year: 2026, region: 'eu' },
];
document.querySelectorAll('[data-presets]').forEach((host) => {
  host.append(h('span', { class: 'presets-label' }, 'Visit a workshop:'));
  for (const p of PRESETS) host.append(h('button', { type: 'button', class: 'tl-btn', onclick: () => store.set({ year: p.year, region: p.region }) }, p.label));
});

syncRegion(store.get());
store.subscribe((s, prev) => {
  if (s.region !== prev.region) syncRegion(s);
});

// ---- views --------------------------------------------------------------------
initDrawer();
mountWall(document.getElementById('view-wall'), store, PIGMENTS);
const machine = mountMachine(document.getElementById('view-machine'), store, { pigments: PIGMENTS, paintings: PAINTINGS });
const lab = mountLab(document.getElementById('view-lab'), store, { cases: CASES, pigments: PIGMENTS });
renderAbout(bind(document, 'about'), { pigments: PIGMENTS });

const VIEWS = ['wall', 'machine', 'lab', 'about'];
function route() {
  const [view = 'wall', arg] = location.hash.replace(/^#/, '').split('/');
  const v = VIEWS.includes(view) ? view : 'wall';
  document.querySelectorAll('.view').forEach((s) => (s.hidden = s.dataset.view !== v));
  document.querySelectorAll('.tabs a').forEach((a) => (a.dataset.view === v ? a.setAttribute('aria-current', 'page') : a.removeAttribute('aria-current')));
  const prev = store.get().view;
  store.set({ view: v });
  if (v === 'machine') machine.activate(arg);
  if (v === 'lab') lab.activate(arg);
  if (prev !== v) window.scrollTo({ top: 0 });
  const titles = { wall: 'The Wall', machine: 'Time Machine', lab: 'The Lab', about: 'About' };
  document.title = `${titles[v]}: Palette of the Possible`;
}
window.addEventListener('hashchange', route);
route();

// Escape closes the drawer automatically (native <dialog>); expose store for debugging
window.__palette = { store };
