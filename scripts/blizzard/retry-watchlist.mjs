import {setTimeout as wait} from 'node:timers/promises';
import {CollectionError,runBlizzardCollection} from './collector.mjs';
import {marketById} from '../../lib/blizzard/markets.mjs';

const RETRY_DELAY=15*60_000;
const serverFor=market=>{
 const row=marketById(market);
 return row ? row.region+':'+row.ruleset : null;
};

export async function collectWithRetries(options,{
 collect=runBlizzardCollection,sleep=wait,now=Date.now
}={}){
 const {log=()=>{}}=options;
 const failures=new Map();
 const deferred=new Map();
 let retryMarkets;
 let globalFailures=0;
 for(let attempt=1;attempt<=3;attempt++){
  log({attempt,maxAttempts:3});
  try{
   const {results,pendingMarkets}=await collect({
    ...options,retryMarkets,force:options.force||retryMarkets!==undefined
   });
   globalFailures=0;
   for(const result of results){
    if(result.verifiedReadback)failures.delete(result.market);
    else failures.set(result.market,(failures.get(result.market)??0)+1);
    if(result.retryAt>now()+RETRY_DELAY)deferred.set(result.market,result.retryAt);
   }
   retryMarkets=new Set(pendingMarkets.filter(market=>!deferred.has(market)));
   if(!retryMarkets.size)break;
  }catch(error){
   globalFailures++;
   const code=error instanceof CollectionError?error.code:'unexpected';
   log({attempt,complete:false,code,status:error instanceof CollectionError?error.status:null});
  }
  if(attempt<3)await sleep(RETRY_DELAY);
 }
 const persistentServers=new Set([...failures]
  .filter(([,count])=>count===3)
  .map(([market])=>serverFor(market)).filter(Boolean));
 const alert=persistentServers.size>=2||(!options.only&&retryMarkets===undefined&&globalFailures===3);
 log({alert,persistentServers:persistentServers.size,globalFailures,
  pendingMarkets:retryMarkets?.size??null,deferredMarkets:deferred.size});
 return {alert};
}
