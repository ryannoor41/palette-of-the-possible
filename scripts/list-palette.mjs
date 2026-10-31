// Print the pigments available in a year as JSON. Used by prodia_repaint.py.
// Usage: node scripts/list-palette.mjs 1300 [eu|world]
import { PIGMENTS } from '../js/data/pigments.js';
import { availableAt } from '../js/time.js';

const year = Number(process.argv[2]);
const region = process.argv[3] === 'world' ? 'world' : 'eu';
if (!Number.isFinite(year)) {
  console.error('usage: node scripts/list-palette.mjs <year> [eu|world]');
  process.exit(1);
}
console.log(JSON.stringify(availableAt(PIGMENTS, year, region).map((p) => p.name)));
