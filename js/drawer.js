// Pigment detail drawer (a <dialog>), opened from jars, chips and lists.
import { h, bind } from './store.js';
import { statusAt, spanFor, formatYear } from './time.js';
import { LINES } from './xrf.js';

let lastFocus = null;

function spanText(s) {
  if (!s) return 'Not used by European painters before modern times';
  const [a, b] = s;
  const from = a <= -40000 ? 'Prehistory' : formatYear(a);
  return b == null ? `${from} to today` : `${from} to about ${formatYear(b)}`;
}

export function openPigment(p, store, pigments) {
  const dlg = bind(document, 'drawer');
  const inner = bind(document, 'drawer-inner');
  const { year, region } = store.get();
  const st = statusAt(p, year, region);
  const s = spanFor(p, region);
  const statusText = {
    available: `On the shelf in ${formatYear(year)}.`,
    future: s ? `Not yet available in ${formatYear(year)}. It arrives in ${formatYear(s[0])}.` : '',
    lost: `By ${formatYear(year)} painters had stopped using it.`,
    never: 'European painters did not use it before modern times. Switch to "Anywhere on Earth" to see where it was used.',
  }[st];

  const close = h('button', { type: 'button', class: 'drawer-close', 'aria-label': 'Close', onclick: () => dlg.close() }, '×');
  const arrival = s ? s[0] : p.world[0];
  const actions = h('div', { class: 'drawer-actions' });
  if (arrival > -40000) {
    actions.append(h('button', {
      type: 'button', class: 'btn', onclick: () => { store.set({ year: arrival }); dlg.close(); },
    }, `Set the dial to ${formatYear(arrival)}`));
  }

  inner.replaceChildren(
    h('div', { class: 'drawer-swatch', '--pig': p.hex }, close),
    h('div', { class: 'drawer-body' },
      h('h2', { id: 'drawer-title' }, p.name),
      p.aka?.length ? h('p', { class: 'aka' }, `Also called ${p.aka.join(', ')}`) : null,
      h('p', { class: 'status-line' }, statusText),
      h('dl', { class: 'facts' },
        h('dt', {}, 'What it is'), h('dd', {}, p.composition),
        h('dt', {}, 'First used'), h('dd', {}, p.firstNote),
        h('dt', {}, 'In Europe'), h('dd', {}, spanText(p.eu)),
        h('dt', {}, 'Worldwide'), h('dd', {}, spanText(p.world)),
        h('dt', {}, 'XRF sees'),
        h('dd', {}, p.elements.length
          ? p.elements.map((e) => h('span', { class: 'el', title: LINES[e]?.name || e }, e))
          : 'Almost nothing: it is made of light elements, so X-ray fluorescence cannot identify it.')
      ),
      h('h3', {}, 'Its story'),
      ...p.story.map((t) => h('p', {}, t)),
      p.uses?.length ? [h('h3', {}, 'Where to see it'), h('ul', {}, p.uses.map((u) => h('li', {}, u)))] : null,
      p.caution ? [h('h3', {}, 'Handle with care'), h('p', {}, p.caution)] : null,
      actions,
      p.sources?.length ? [h('h3', {}, 'Sources'), h('ul', { class: 'sources' }, p.sources.map(([label, url]) => h('li', {}, h('a', { href: url, target: '_blank', rel: 'noopener' }, label))))] : null
    )
  );
  lastFocus = document.activeElement;
  if (!dlg.open) dlg.showModal();
  close.focus();
}

export function initDrawer() {
  const dlg = bind(document, 'drawer');
  dlg.addEventListener('click', (e) => {
    if (e.target === dlg) dlg.close(); // click on backdrop
  });
  dlg.addEventListener('close', () => lastFocus?.focus?.());
}
