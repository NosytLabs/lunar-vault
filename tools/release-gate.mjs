import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname,'..');
const problems=[];
const app=path.join(root,'apps/lunar-vault');
const config=fs.readFileSync(path.join(app,'src/game/config.ts'),'utf8');
if(/\brtp:\s*0\.97\b/.test(config)) problems.push('SDK sample RTP 97.0% is outside Engine 96.0%–96.70%; replace ONLY after verifying certified math.');
if(!fs.existsSync(path.join(root,'math','publish_files','index.json'))) problems.push('No certified Engine math publish_files/index.json; source demo math is not compatible with Web SDK event types.');
const game=fs.readFileSync(path.join(app,'src/components/Game.svelte'),'utf8');
const manifest=JSON.parse(fs.readFileSync(path.join(app,'static/assets/audio/sounds.json'),'utf8'));
if(manifest.src?.length !== 1 || !manifest.src[0].includes('nosyt-sprite.wav')) {
 problems.push('Original audio manifest is not active.');
}
if(!fs.existsSync(path.join(root,'tools/generate-audio.py'))) {
 problems.push('Original audio generator is missing.');
}
for (const oldFile of ['sounds.ogg','sounds.mp3','sounds.m4a','sounds.ac3']) {
 if (fs.existsSync(path.join(app,'static/assets/audio',oldFile))) {
  problems.push('Sample audio binary still bundled: '+oldFile);
 }
}
for(const p of ['WinCoins.svelte','SymbolSpine.svelte']){
  const t=fs.readFileSync(path.join(app,'src/components',p),'utf8');
  if(t.includes('SpineProvider')||t.includes("key=\"coins\"")) problems.push('Sample visual effects still referenced by '+p);
}
if(game.includes('I18nTest'))problems.push('SDK I18nTest remains mounted in game production path; validate or remove for release.');
console.log('Lunar Vault pre-submission gate: '+(problems.length?'BLOCKED':'NO AUTOMATED BLOCKERS'));
for(const p of problems)console.log(' - '+p);
if(problems.length)process.exitCode=1;
