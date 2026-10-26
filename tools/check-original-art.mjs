import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const app = path.join(root, 'apps/lunar-vault');
const get = (p) => fs.readFileSync(path.join(app,p),'utf8');
const assets = get('src/game/assets.ts');
const symbolMap = get('src/game/constants.ts');
const colors = ['H1','H2','H3','H4','H5','L1','L2','L3','L4','L5','W','S'];
const extras = ['observatory','observatory-feature','reel-frame','win-aura','logo'];
const failures = [];
for (const name of [...colors.map(x => x.toLowerCase()),...extras]) {
  const file = path.join(app,'static/assets/nosyt',name+'.svg');
  if (!fs.existsSync(file)) failures.push('Missing '+file);
  else {
    const source = fs.readFileSync(file,'utf8');
    if (!source.startsWith('<svg ') || !source.includes('</svg>')) failures.push('Malformed SVG skeleton: '+file);
    if (source.includes('http://') && !source.includes('http://www.w3.org/2000/svg')) failures.push('Unexpected remote ref: '+file);
  }
}
for (const symbol of colors) {
  if (!assets.includes('lunar'+symbol+':')) failures.push('Asset manifest missing '+symbol);
  if (!symbolMap.includes(symbol+': { explosion, static: icon(')) failures.push('Symbol map lacks original art for '+symbol);
}
const expectedPaths = ['src/components/Background.svelte','src/components/LoadingScreen.svelte','src/components/WinAnimation.svelte'];
for(const p of expectedPaths) if(!get(p).includes('lunar')) failures.push('Sample artwork has not been replaced in '+p);
if (get('src/routes/+layout.svelte').includes('<LoaderStakeEngine')) failures.push('Forbidden SDK-branded loader still mounted.');
if (get('src/components/Game.svelte').includes('ADD YOUR LOGO')) failures.push('Unbranded logo placeholder still visible.');
if (failures.length) { console.error(failures.join('\n')); process.exitCode=1; }
else console.log('Original art smoke check passed: 17 local SVG textures, 12 game symbols, UI wiring and no SDK splash.');
