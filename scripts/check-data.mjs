// Sanity checks for the data files: run with `npm run check`.
import { PIGMENTS } from '../js/data/pigments.js';
import { PAINTINGS } from '../js/data/paintings.js';
import { CASES } from '../js/data/cases.js';
import { LINES } from '../js/xrf.js';
import { availableAt, MAX_YEAR } from '../js/time.js';
import { reachable, hull2d, polygonArea } from '../js/gamut.js';

let errors = 0;
const fail = (m) => { errors++; console.error('✗', m); };
const ids = new Set();
for (const p of PIGMENTS) {
  if (ids.has(p.id)) fail(`duplicate id ${p.id}`);
  ids.add(p.id);
  for (const k of ['name', 'hex', 'composition', 'firstNote', 'dateLabel']) if (!p[k]) fail(`${p.id} missing ${k}`);
  if (!/^#[0-9a-f]{6}$/i.test(p.hex)) fail(`${p.id} bad hex`);
  if (!Array.isArray(p.world) || p.world.length !== 2) fail(`${p.id} bad world span`);
  if (p.eu && (p.eu[1] != null && p.eu[1] < p.eu[0])) fail(`${p.id} eu span reversed`);
  if (p.world[1] != null && p.world[1] < p.world[0]) fail(`${p.id} world span reversed`);
  if (p.eu && p.eu[0] < p.world[0]) fail(`${p.id} reaches Europe before it exists anywhere`);
  for (const e of p.elements) if (!LINES[e] && !['Si', 'Al', 'Na', 'P', 'S', 'Cl', 'K'].includes(e)) fail(`${p.id} unknown element ${e}`);
  if (!p.story?.length) fail(`${p.id} no story`);
  if (!p.sources?.length) fail(`${p.id} no sources`);
}
for (const pt of PAINTINGS) for (const id of pt.pigments) if (!ids.has(id)) fail(`painting ${pt.id} references unknown pigment ${id}`);
for (const c of CASES) {
  for (const q of c.questions) if (q.options.filter((o) => o.correct).length !== 1) fail(`case ${c.id}: question needs exactly one correct option`);
  for (const e of Object.keys(c.composition)) if (!LINES[e] && e !== 'Al') fail(`case ${c.id} unknown element ${e}`);
}
const today = reachable(availableAt(PIGMENTS, MAX_YEAR, 'world'));
console.log(`${PIGMENTS.length} pigments, ${PAINTINGS.length} paintings, ${CASES.length} cases`);
console.log(`today's palette mixes ${today.ok.length} distinct colours; hull area ${polygonArea(hull2d(today.ok)).toFixed(4)}`);
for (const y of [-40000, -3000, 0, 1000, 1300, 1503, 1700, 1800, 1850, 1900, 1950, 2026]) {
  const pigs = availableAt(PIGMENTS, y, 'eu');
  const set = reachable(pigs);
  console.log(String(y).padStart(6), String(pigs.length).padStart(3), 'pigments', String(set.ok.length).padStart(6), 'mixes', 'area', polygonArea(hull2d(set.ok)).toFixed(4));
}
if (errors) { console.error(`${errors} problem(s)`); process.exit(1); }
console.log('✓ data checks passed');
