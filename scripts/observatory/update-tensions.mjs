// Credentials are read once, through hidden stdin. No dependencies are required.
import {createHash} from 'node:crypto';
import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {spawnSync} from 'node:child_process';
import {PROJECT_ID,SITE_URL,runUpdates,UpdateError} from './tensions-client.mjs';
if(!process.argv.includes('--stdin'))throw Error('Use --stdin');
if(process.stdin.isTTY&&spawnSync('stty',['-echo'],{stdio:['inherit','ignore','ignore']}).status!==0)throw Error('Unable to hide stdin');
console.log('Ready for update access JSON on stdin (input hidden).');
const reader=createInterface({input:process.stdin,terminal:false});let options;
try{const [line]=await once(reader,'line');try{options=JSON.parse(line);}catch{throw Error('Invalid access input');}}
finally{reader.close();process.stdin.pause();if(process.stdin.isTTY)spawnSync('stty',['echo'],{stdio:['inherit','ignore','ignore']});}
try{
 if(options.projectId!==PROJECT_ID||options.siteUrl!==SITE_URL)throw new UpdateError('configuration','wrong_site');
 const applicationToken=options.applicationToken??(typeof options.siteAccessToken==='string'?createHash('sha256').update('mana-mechanica:tensions:v1:'+PROJECT_ID+':'+options.siteAccessToken).digest('hex'):null);
 const {summary}=await runUpdates({applicationToken,siteAccessToken:process.argv.includes('--with-sites-access')?options.siteAccessToken:undefined,only:process.argv.find(a=>a.startsWith('--only='))?.slice(7),log:r=>console.log(JSON.stringify(r))});
 if(!summary.complete||summary.sourceFailures)process.exitCode=1;
}catch(error){const e=error instanceof UpdateError?error:new UpdateError('update','unexpected');console.error(JSON.stringify({complete:false,stage:e.stage,code:e.code,status:e.status}));process.exitCode=1;}
