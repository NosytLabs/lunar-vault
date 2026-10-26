import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(import.meta.dirname,'..');
const problems=[];
const app=path.join(root,'apps/lunar-vault');
const config=fs.readFileSync(path.join(app,'src/game/config.ts'),'utf8');
if(/\brtp:\s*0\.97\b/.test(config)) problems.push('SDK sample RTP 97.0% is outside Engine 96.0%–96.70%; replace ONLY after verifying certified math.');
if(!fs.existsSync(path.join(root,'math','publish_files','index.json'))) problems.push('No certified Engine math publish_files/index.json; source demo math is not compatible with Web SDK event types.');
const game=fs.readFileSync(path.join(app,'src/components/Game.svelte'),'utf8');
const active=fs.readFileSync(path.join(app,'src/components/Sound.svelte'),'utf8');
if(active.includes("sound.players.music.play"))problems.push('Sample SDK sound effects and music still used; replace with original mix.');
for(const p of ['FreeSpinIntro.svelte','FreeSpinOutro.svelte','WinCoins.svelte','SymbolSpine.svelte']){
  const t=fs.readFileSync(path.join(app,'src/components',p),'utf8');
  if(t.includes('SpineProvider')||t.includes("key=\"coins\"")) problems.push('Sample visual effects still referenced by '+p);
}
if(game.includes('I18nTest'))problems.push('SDK I18nTest remains mounted in game production path; validate or remove for release.');
console.log('Lunar Vault pre-submission gate: '+(problems.length?'BLOCKED':'NO AUTOMATED BLOCKERS'));
for(const p of problems)console.log(' - '+p);
if(problems.length)process.exitCode=1;
