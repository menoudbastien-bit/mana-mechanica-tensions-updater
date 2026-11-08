// A scheduler triggers the hosted calculation; it never supplies prices.
export const PROJECT_ID='appgprj_6adf82cdbe1081919f3e44ce1525cd98';
export const SITE_URL='https://mana-mechanica.com';
const DEFAULT_MARKET='forever.normal.alliance.eu';
export class UpdateError extends Error {
 constructor(stage,code,status=null){super(stage+': '+code+(status?' (HTTP '+status+')':''));this.stage=stage;this.code=code;this.status=status;this.auth=status===401||status===403;}
}
const fail=(stage,code)=>{throw new UpdateError(stage,code);};
const validMarket=id=>typeof id==='string'&&/^forever\.[a-z0-9_-]+\.[a-z0-9_-]+\.[a-z0-9_-]+$/.test(id);
export async function jsonRequest(fetchFn,url,stage,options={}){
 let response;
 try{response=await fetchFn(url,{redirect:'error',cache:'no-store',...options,signal:AbortSignal.timeout(options.method==='POST'?240000:30000)});}
 catch{throw new UpdateError(stage,'transport');}
 if(!response.ok)throw new UpdateError(stage,'http',response.status);
 try{return await response.json();}catch{throw new UpdateError(stage,'invalid_json');}
}
export async function discoverMarkets(fetchFn=fetch){
 const data=await jsonRequest(fetchFn,'https://api.ahledger.com/v1/markets','discovery');
 if(!Array.isArray(data.markets))fail('discovery','invalid_markets');
 const markets=data.markets.filter(m=>m.game==='forever');
 if(!markets.length||markets.some(m=>!validMarket(m.id))||new Set(markets.map(m=>m.id)).size!==markets.length)fail('discovery','invalid_markets');
 return markets.sort((a,b)=>a.id===DEFAULT_MARKET?-1:b.id===DEFAULT_MARKET?1:a.id.localeCompare(b.id));
}
export function validateSnapshot(data,market,{allowEmpty=false}={}){
 if(data?.market!==market)fail('verification','market_mismatch');
 if(allowEmpty&&data.calculatedAt===null&&Array.isArray(data.states)&&data.states.length===0)return data;
 if(!Number.isFinite(data.calculatedAt)||!Array.isArray(data.states)||data.states.length!==75)fail('verification','invalid_snapshot');
 const ids=new Set(data.states.map(s=>s.id));
 if(ids.size!==75||data.states.some(s=>s.market!==market||!Number.isSafeInteger(s.id)||s.id<=0))fail('verification','item_identity');
 if(!Array.isArray(data.top)||data.top.length>10||new Set(data.top.map(s=>s.id)).size!==data.top.length||data.top.some(s=>s.market!==market||!ids.has(s.id)))fail('verification','ranking_identity');
 for(const state of data.states){
  const at=state.observedAt;
  if(at!==null&&at!==undefined&&(!Number.isFinite(at)||at>data.calculatedAt+300000))fail('verification','source_timestamp');
  const episodes=state.episodes;
  if(!Array.isArray(episodes)||new Set(episodes.map(e=>e.key)).size!==episodes.length||episodes.filter(e=>e.endedAt===null).length>1)fail('verification','episode_identity');
  for(const e of episodes){
   if(e.market!==market||e.id!==state.id||!Number.isFinite(e.firstDetectedAt)||e.firstDetectedAt>data.calculatedAt)fail('verification','episode_market');
   if(!Array.isArray(e.events)||!Number.isSafeInteger(e.confirmations)||e.confirmations<1)fail('verification','invalid_confirmations');
   const confirmations=e.events.filter(x=>x.status==='new'||x.status==='persistent');
   if(new Set(confirmations.map(x=>x.at)).size!==confirmations.length||e.confirmations!==confirmations.length)fail('verification','duplicate_confirmation');
   const x=e.lastSignal;
   if(!x||!x.reference||!x.current||![x.reference.median,x.reference.quantity,x.current.median,x.current.quantity,x.priceAbs,x.quantityAbs,x.pricePct,x.quantityPct].every(Number.isFinite)||!(x.reference.median>0)||!(x.reference.quantity>0)||x.priceAbs!==x.current.median-x.reference.median||x.quantityAbs!==x.current.quantity-x.reference.quantity||Math.abs(x.pricePct-x.priceAbs/x.reference.median)>1e-10||Math.abs(x.quantityPct-x.quantityAbs/x.reference.quantity)>1e-10)fail('verification','signal_arithmetic');
  }
 }
 return data;
}
export function verifyHistory(before,after){
 if(before.calculatedAt!==null&&after.calculatedAt<before.calculatedAt)fail('verification','calculation_regressed');
 for(const state of before.states){
  const saved=after.states.find(s=>s.id===state.id);
  if(!saved)fail('verification','item_removed');
  for(const old of state.episodes){
   const e=saved.episodes.find(x=>x.key===old.key);
   if(!e||e.firstDetectedAt!==old.firstDetectedAt||e.confirmations<old.confirmations||JSON.stringify(e.events.slice(0,old.events.length))!==JSON.stringify(old.events))fail('verification','history_changed');
  }
 }
}
export function summarize(data,extra={}){
 const dates=data.states.map(s=>s.observedAt===undefined?s.lastAt:s.observedAt).filter(Number.isFinite),unavailable={};
 for(const s of data.states.filter(s=>s.availability!=='available'))unavailable[s.reason??'unknown']=(unavailable[s.reason??'unknown']??0)+1;
 return {market:data.market,verifiedReadback:true,calculatedAt:data.calculatedAt,items:data.states.length,usable:data.states.filter(s=>s.availability==='available').length,missingObservations:data.states.filter(s=>(s.observedAt===undefined?s.lastAt:s.observedAt)==null).length,sourceFailures:data.failures?.length??0,unavailable,observations:dates.length?[Math.min(...dates),Math.max(...dates)]:[],top:data.top.length,...extra};
}
export async function refreshMarket(market,{applicationToken,siteAccessToken,fetchFn=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),now=Date.now}={}){
 if(!validMarket(market))fail('configuration','invalid_market');
 if(typeof applicationToken!=='string'||!/^[a-f0-9]{64}$/.test(applicationToken))fail('configuration','missing_application_access');
 const read=async allowEmpty=>validateSnapshot(await jsonRequest(fetchFn,SITE_URL+'/api/tensions?market='+encodeURIComponent(market),'readback'),market,{allowEmpty});
 const before=await read(true),startedAt=now();let expectedAt=null,lastError,posts=0;
 const verified=(saved,extra={})=>{verifyHistory(before,saved);return summarize(saved,{posts,unchanged:saved.calculatedAt===before.calculatedAt,...extra});};
 const recover=async()=>{
  try{
   const saved=await read(false);
   if(expectedAt!==null&&saved.calculatedAt===expectedAt)return verified(saved,{recovered:true});
   if(expectedAt===null&&saved.calculatedAt>(before.calculatedAt??0)&&saved.calculatedAt>=startedAt-5000&&saved.calculatedAt<=now()+5000)return verified(saved,{recovered:true});
  }catch(e){if(e.auth||e.stage==='verification')throw e;}
  return null;
 };
 for(let attempt=0;attempt<2;attempt++){
  if(attempt){await sleep(20000);const recovered=await recover();if(recovered)return recovered;}
  try{
   const headers={Authorization:'Bearer '+applicationToken};
   if(siteAccessToken)headers['OAI-Sites-Authorization']='Bearer '+siteAccessToken;
   posts++;
   const updated=validateSnapshot(await jsonRequest(fetchFn,SITE_URL+'/api/tensions/refresh?market='+encodeURIComponent(market),'refresh',{method:'POST',headers}),market);
   expectedAt=updated.calculatedAt;
   const saved=await read(false);
   if(saved.calculatedAt!==expectedAt)fail('verification','calculated_at_mismatch');
   return verified(saved,{unchanged:updated.unchanged===true||saved.calculatedAt===before.calculatedAt,recovered:false});
  }catch(e){
   lastError=e instanceof UpdateError?e:new UpdateError('update','unexpected');
   if(lastError.auth||lastError.stage==='verification'||(lastError.status&&lastError.status<500&&lastError.status!==429))throw lastError;
   const recovered=await recover();if(recovered)return recovered;
  }
 }
 throw lastError;
}
export async function runUpdates(options={}){
 const {fetchFn=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms)),log=()=>{},only}=options;
 let markets=await discoverMarkets(fetchFn);if(only){markets=markets.filter(m=>m.id===only);if(!markets.length)fail('configuration','unknown_market');}
 const results=[];let attempted=0;
 for(let i=0;i<markets.length;i++){
  const market=markets[i].id;attempted++;
  try{const r=await refreshMarket(market,{...options,fetchFn,sleep});results.push(r);log(r);}
  catch(error){const e=error instanceof UpdateError?error:new UpdateError('update','unexpected');const r={market,verifiedReadback:false,stage:e.stage,code:e.code,status:e.status};results.push(r);log(r);if(e.auth)break;}
  if(i<markets.length-1)await sleep(20000);
 }
 const verified=results.filter(r=>r.verifiedReadback),failed=results.filter(r=>!r.verifiedReadback);
 const summary={complete:attempted===markets.length&&failed.length===0,discovered:markets.length,attempted,verified:verified.length,unchanged:verified.filter(r=>r.unchanged).length,failed:failed.length,notAttempted:markets.length-attempted,usableItems:verified.reduce((n,r)=>n+r.usable,0),marketsWithoutUsableData:verified.filter(r=>r.usable===0).length,missingObservations:verified.reduce((n,r)=>n+r.missingObservations,0),sourceFailures:verified.reduce((n,r)=>n+r.sourceFailures,0)};
 log(summary);return {summary,results};
}
