// Programmatic acceptance invariants (spec §7.2): no NaN; every box centre ±size/2
// lies inside at least one transport bbox. Run: node scripts/check-invariants.mjs lorry truck container
import { readFile } from 'node:fs/promises';
import { extractResult, sceneFromResult } from '../shared/sceneFromResult.js';

const models = process.argv.slice(2);
if (!models.length) { console.error('Usage: node scripts/check-invariants.mjs <model> [<model>...]'); process.exit(2); }
let failed = 0;
const finite = (v) => Number.isFinite(v.x) && Number.isFinite(v.y) && Number.isFinite(v.z);
const EPS = 0.01;
const inside = (b, t) =>
  Math.abs(b.center.x - t.center.x) <= (t.size.x - b.size.x) / 2 + EPS &&
  Math.abs(b.center.y - t.center.y) <= (t.size.y - b.size.y) / 2 + EPS &&
  Math.abs(b.center.z - t.center.z) <= (t.size.z - b.size.z) / 2 + EPS;

for (const model of models) {
  const url = new URL(`../samples/${model}/response.json`, import.meta.url);
  const response = JSON.parse(await readFile(url, 'utf8'));
  const { transports, boxes } = sceneFromResult(extractResult(response));
  for (const b of boxes) {
    if (!finite(b.center) || !finite(b.size)) { console.error(`${model}: NaN in box`); failed++; }
    else if (!transports.some((t) => inside(b, t))) { console.error(`${model}: box outside all transports @ ${JSON.stringify(b.center)}`); failed++; }
  }
  console.log(`${model}: ${boxes.length} boxes, ${transports.length} transports — ${failed ? 'CHECK ABOVE' : 'ok'}`);
}
process.exit(failed ? 1 : 0);
