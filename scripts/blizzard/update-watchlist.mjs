// Server access travels only over hidden stdin, never argv or credential files.
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {PROJECT_ID,SITE_URL,runBlizzardCollection,CollectionError} from './collector.mjs';
import {runHourlyBatches} from './hourly-batches.mjs';
import {collectWithRetries} from './retry-watchlist.mjs';
if(!process.argv.includes('--stdin'))throw Error('Use --stdin');
if(process.stdin.isTTY&&spawnSync('stty',['-echo'],{stdio:['inherit','ignore','ignore']}).status!==0)throw Error('Unable to hide stdin');
console.log('Ready for Blizzard collection access on hidden stdin.');
const input=createInterface({input:process.stdin,terminal:false});let config;
try{const [line]=await once(input,'line');try{config=JSON.parse(line);}catch{throw new CollectionError('invalid_access_input');}}
finally{input.close();process.stdin.pause();if(process.stdin.isTTY)spawnSync('stty',['echo'],{stdio:['inherit','ignore','ignore']});}
try{
 if(config.projectId!==PROJECT_ID||config.siteUrl!==SITE_URL)throw new CollectionError('wrong_site');
 const applicationToken=config.applicationToken??(typeof config.siteAccessToken==='string'?createHash('sha256').update('mana-mechanica:blizzard:v1:'+PROJECT_ID+':'+config.siteAccessToken).digest('hex'):null);
 const options={applicationToken,siteAccessToken:process.argv.includes('--with-sites-access')?config.siteAccessToken:undefined,only:process.argv.find(x=>x.startsWith('--only='))?.slice(7),force:process.argv.includes('--force'),log:row=>console.log(JSON.stringify(row))};
 const hourly=process.argv.includes('--hourly-batches');
 const scheduled=hourly || process.argv.includes('--scheduled-retries');
 const collect=hourly?runHourlyBatches:scheduled?collectWithRetries:runBlizzardCollection;
 let result=await collect(options);
 if(result.summary.complete&&result.nextCheckAt&&process.argv.includes('--follow-near-deadline')&&!options.force){
  await new Promise(resolve=>setTimeout(resolve,Math.max(0,result.nextCheckAt-Date.now())));
  result=await collect(options);
 }
 if(scheduled?result.alert:!result.summary.complete)process.exitCode=1;
}catch(error){const e=error instanceof CollectionError?error:new CollectionError('unexpected');console.error(JSON.stringify({complete:false,code:e.code,status:e.status??null}));process.exitCode=1;}
finally{config=null;}
