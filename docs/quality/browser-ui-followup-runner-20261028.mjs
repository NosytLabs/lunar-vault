import base from './browser-ui-runner-20261028.mjs';
const evidence='/tmp/slot-ux-20261028/presentation-followup';
export default {
 ...base,
 reporter:[['list'],['json',{outputFile:evidence+'/full-results.json'}]],
 outputDir:evidence+'/full-results',
 projects:base.projects.filter(project=>['lunar-presentation-fresh','lunar-ux-release'].includes(project.name)).map(project=>({
  ...project,
  grep:project.name==='lunar-presentation-fresh'
   ? /recovered retrigger count|final free spin returns|small feature replay retains/
   : /INFO dialog|PAYTABLE dialog/,
  use:project.name==='lunar-ux-release'
   ? {...project.use,trace:'off',screenshot:'only-on-failure'}
   : project.use,
 })),
};
