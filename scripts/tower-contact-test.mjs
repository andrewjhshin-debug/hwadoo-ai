import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import sharp from 'sharp';
function load(file, deps = {}) {
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const exports = {};
  new Function('require', 'exports', code)(name => deps[name], exports);
  return exports;
}
const shapes = JSON.parse(fs.readFileSync('src/lib/tower-shapes.json', 'utf8'));
const balance = load('src/lib/tower-balance.ts');
const geometry = load('src/lib/tower-geometry.ts', { './tower-shapes.json': { default: shapes } });
const game = load('src/lib/tower-game.ts', { './tower-balance': balance, './tower-geometry': geometry });
let checked = 0;
for (let a = 0; a < 9; a++) for (let b = 0; b < 9; b++) for (const angle of [-12, 0, 12]) {
  const shape = art => ({ ...game.stoneSpec(1, 1), art, width: 150, height: 150 * balance.TOWER_STONES[art].crop[3] / balance.TOWER_STONES[art].crop[2], angle, x: 0, y: 300 });
  const below = shape(a), upper = { ...shape(b), x: 17, angle: -angle };
  upper.y = geometry.silhouetteSeat(upper, below, 500);
  assert(Number.isFinite(upper.y));
  const lowerEdge = geometry.stoneEnvelope(below), upperEdge = geometry.stoneEnvelope(upper);
  let closest = Infinity;
  for (let x = -200; x < 200; x += .25) {
    const low = geometry.surfaceAt(lowerEdge, x - below.x, 'top');
    const high = geometry.surfaceAt(upperEdge, x - upper.x, 'bottom');
    if (low !== null && high !== null) closest = Math.min(closest, below.y + low - upper.y - high);
  }
  assert(closest < -.9 && closest > -2.5, `contact ${a}/${b}/${angle}: ${closest}`);
  checked++;
}
async function color(file) {
  const { data } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let count = 0, r = 0, g = 0, b = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 240) { count++; r += data[i]; g += data[i + 1]; b += data[i + 2]; }
  return [r / count, g / count, b / count];
}
const before = await color('public/obj/stone-cairn-atlas-v4.png');
const after = await color('public/obj/stone-cairn-atlas-v5.png');
assert(after.reduce((a, b) => a + b) > before.reduce((a, b) => a + b) + 30, 'new stones are brighter');
assert(Math.max(...after) - Math.min(...after) < 12, 'neutral grey rather than brown');
console.log(`PASS: ${checked} stone/rotation contacts, brighter neutral grey`, { before, after });
if (process.argv.includes('--preview')) {
  const stones = [];
  for (let depth = 0; depth < 9; depth++) {
    let best;
    for (let x = -95; x <= 95; x += 2) {
      const stone = game.dropStone(stones, x, 17), state = game.stability([...stones, stone]);
      if (state.stable && (!best || state.risk < best.risk)) best = { stone, risk: state.risk };
    }
    if (!best) break;
    stones.push(best.stone);
  }
  const top = Math.min(...stones.map(s => s.y + Math.min(...geometry.stoneEnvelope(s).top.filter(Number.isFinite))));
  const bottom = Math.max(...stones.map(s => s.y + Math.max(...geometry.stoneEnvelope(s).bottom.filter(Number.isFinite))));
  const atlas = fs.readFileSync('public/obj/stone-cairn-atlas-v5.png').toString('base64');
  const rocks = stones.map(s => {
    const crop = balance.TOWER_STONES[s.art].crop;
    return `<g transform="translate(${s.x},${s.y + s.height * s.bottom}) rotate(${s.angle})"><svg x="${-s.width / 2}" y="${-s.height * s.bottom}" width="${s.width}" height="${s.height}" viewBox="${crop.join(' ')}"><image href="data:image/png;base64,${atlas}" width="1254" height="1254"/></svg></g>`;
  }).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="440" height="780" viewBox="-150 ${top - 20} 300 ${bottom - top + 40}"><rect x="-150" y="${top - 20}" width="300" height="${bottom - top + 40}" fill="#faf8f6"/>${rocks}</svg>`;
  await sharp(Buffer.from(svg)).png().toFile('C:/Users/user/Downloads/tower-grey-contact-preview.png');
}
