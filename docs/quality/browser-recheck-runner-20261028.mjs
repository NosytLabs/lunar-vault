const repository='/workspace/scratch/87411a2f3bc3/lunar-vault';
const evidence='/tmp/engine-review-recheck-20261028';
export default {
 timeout:45000,
 expect:{timeout:10000},
 workers:1,
 reporter:[['list'],['json',{outputFile:evidence+'/full-results.json'}]],
 outputDir:evidence+'/full-results',
 use:{screenshot:'on',trace:'retain-on-failure',launchOptions:{executablePath:'/tmp/lunar-headless-shell-1161/chrome-linux/headless_shell',args:['--no-sandbox']}},
 projects:[
  {name:'lunar-presentation-fresh',testDir:repository+'/tests',testMatch:'lunar-presentation.spec.ts',use:{baseURL:'http://127.0.0.1:4173'}},
  {name:'lunar-contracts-fresh',testDir:repository+'/tests',testMatch:'lunar-vault.spec.ts',grep:/original publication|documented uppercase|invalid advertised|server-only social|replay .*readable|positive undocumented|base maximum and full|empty HTTP replay|replay optional|per-mode server maximum|active round keeps its non-default|active round checkpoints|already closed positive|zero balance explains|small social replay|restricted session disables|interrupted sprite fetch retries|permanently missing sprite|current publication Eclipse|an interrupted play preserves|phone currency|wallet play uses|explicit HTTPS RGS|sub-cent award|invalid RGS host|win settles once|autoplay can be cancelled|master mute remains available|base-only|held Space stops/,use:{baseURL:'http://127.0.0.1:4173'}},
  {name:'salmon-contracts-fresh',testDir:repository+'/apps/salmon-run/tests',testMatch:'salmon.spec.ts',grep:/Space protects|documented array|malformed array|River Run replay uses its full|after-play River Run|mid-feature recovery|active event checkpoints|social rules|zero balance prevents|base mode limit|positive.*duration|server-only social|round-duration|replay uses only its endpoint, displays cost|dynamic .* amounts|invalid RGS reports|mute is available during|base-only/,use:{baseURL:'http://127.0.0.1:4174'}},
  {name:'salmon-collection-recheck',timeout:60000,testDir:repository+'/apps/salmon-run/tests',testMatch:'salmon.spec.ts',grep:/River Run shows value collection/,use:{baseURL:'http://127.0.0.1:4174'}},
  {name:'lunar-edges-recheck',testDir:repository+'/tests',testMatch:'lunar-recheck.spec.ts',use:{baseURL:'http://127.0.0.1:4173',viewport:{width:800,height:450},reducedMotion:'reduce'}},
  {name:'salmon-edges-recheck',testDir:repository+'/apps/salmon-run/tests',testMatch:'recheck.spec.ts',use:{baseURL:'http://127.0.0.1:4174',reducedMotion:'reduce'}}
 ],
 webServer:[
  {command:'python3 tools/serve-static.py --port4173 --directory apps/lunar-vault/build'.replace('--port4173','--port 4173'),cwd:repository,url:'http://127.0.0.1:4173',reuseExistingServer:true},
  {command:'python3 tools/serve-static.py --port4174 --directory apps/salmon-run/dist'.replace('--port4174','--port 4174'),cwd:repository,url:'http://127.0.0.1:4174',reuseExistingServer:true}
 ]
};
