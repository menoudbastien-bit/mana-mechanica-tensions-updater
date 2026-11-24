import {createHash} from 'node:crypto';
import {markets, marketById, REGION_CONFIG} from '../../lib/blizzard/markets.mjs';
import {summarizeListings} from '../../lib/blizzard/listing-metrics.mjs';

export const PROJECT_ID='appgprj_6adf82cdbe1081919f3e44ce1525cd98';
export const SITE_URL='https://mana-mechanica.com';
const HOUR=3600000;
export class CollectionError extends Error {
 constructor(code,status=null,feed=null,retryAt=null){super(code);this.code=code;this.status=status;this.feed=feed;this.retryAt=retryAt;}
}
const validIds=ids=>Array.isArray(ids)&&ids.length>0&&ids.every(id=>Number.isSafeInteger(id)&&id>0)&&new Set(ids).size===ids.length;
const sourceDate=value=>{const t=Date.parse(value);return Number.isFinite(t)?t:null;};
export function dueAt(row,now=Date.now()) {
 if(!row||!Number.isFinite(row.sourceAt))return Number.isFinite(row?.retryNotBefore)?row.retryNotBefore:0;
 const retry=row.retryNotBefore||0;
 // Follow the observed source minute; stale providers back off. Scheduler
 // checks do not create observations or imply five-minute source snapshots.
 const retryGap=now-row.sourceAt>2*HOUR?15*60000:5*60000;
 return Math.max(row.sourceAt+HOUR+60000,(row.lastCheckedAt||0)+retryGap,retry);
}
// GitHub can deliver the next scheduled job after the provider has replaced a snapshot.
export function nearDeadline(rows,status,now){
 const deadlines=rows.map(row=>dueAt(status.get(row.id),now))
  .filter(at=>at>now&&at<=now+12*60000);
 return deadlines.length?Math.max(...deadlines):null;
}
export function apiUrl(market,kind){
 const r=REGION_CONFIG[market.region];
 if(!market.available||!r?.host||!Number.isSafeInteger(market.houseId))throw new CollectionError('unsupported_market');
 return `https://${r.host}/data/wow/ruleset/${market.queryRulesetId}/auctions/${market.houseId}${kind==='commodity'?'/commodities':''}?namespace=${market.namespace}&locale=${r.locale}`;
}
export function validateFeedDocument(body,market,kind,url){
 if(!body||typeof body!=='object'||Array.isArray(body))throw new CollectionError('invalid_feed_document',null,kind);
 const self=body._links?.self?.href;
 let u;try{u=new URL(self);}catch{throw new CollectionError('missing_feed_identity',null,kind);}
 const expected=new URL(url);
 if(u.origin!==expected.origin||u.pathname.replace(/\/$/,'')!==expected.pathname||u.searchParams.get('namespace')!==market.namespace)throw new CollectionError('feed_identity_mismatch',null,kind);
 if(kind==='auction'&&body.id!==market.houseId)throw new CollectionError('house_identity_mismatch',null,kind);
 const englishFaction=({'Alliance Auction House':'alliance','Horde Auction House':'horde','Blackwater Auction House':'neutral'})[body.name];
 if(englishFaction&&englishFaction!==market.faction)throw new CollectionError('house_faction_mismatch',null,kind);
 if(body.faction?.type&&String(body.faction.type).toLowerCase()!==market.faction)throw new CollectionError('house_faction_mismatch',null,kind);
 if(body.ruleset?.id!==undefined&&body.ruleset.id!==market.queryRulesetId)throw new CollectionError('query_ruleset_mismatch',null,kind);
 // Empty Forever houses can omit auctions. This is accepted only after the
 // document identity was validated, and never turns absent item stock into 0.
 if(body.auctions!==undefined&&!Array.isArray(body.auctions))throw new CollectionError('invalid_listings_array',null,kind);
 return body.auctions??[];
}
export function composeItems(ids,feeds){
 return ids.map(id=>{
  const found=feeds.flatMap(feed=>{const row=feed.metrics?.basket.find(x=>x.id===id);return row?.observed?[{feed,row}]:[];});
  if(found.length!==1)return {id,feed:null,at:null,min:null,median:null,mean:null,quantity:null,auctions:null,pricedQuantity:null,status:'INDISPONIBLE',warnings:[found.length?'cross_feed_overlap':'not_listed_in_snapshot']};
  const {feed,row}=found[0];
  const priced=row.min!==null&&row.weightedMedian!==null&&row.weightedMean!==null;
  return {id,feed:feed.meta.kind,at:feed.meta.at,min:priced?row.min:null,median:priced?row.weightedMedian:null,mean:priced?row.weightedMean:null,quantity:row.totalQuantity,auctions:row.totalAuctions,pricedQuantity:row.pricedQuantity,status:priced?'OK':'SANS_PRIX',warnings:row.warnings,meanExact:row.weightedMeanExact,medianExact:row.weightedMedianExact,quantityExact:row.totalQuantityExact,variantCount:row.variantCount};
 });
}
function cachedFeed(cache,kind,ids){
 // The composed cache intentionally withholds cross-feed conflicts. It
 // cannot reconstruct their original per-feed membership: request fresh
 // 200 documents instead of silently removing the conflicting evidence.
 if(cache?.items?.some(row=>row.warnings?.includes('cross_feed_overlap')))return null;
 const meta=cache?.feeds?.find(x=>x.kind===kind);
 if(!meta||!Array.isArray(cache?.items))return null;
 const rows=cache.items.filter(x=>x.feed===kind).map(x=>({id:x.id,observed:true,min:x.min,weightedMedian:x.median,weightedMean:x.mean,totalQuantity:x.quantity,totalAuctions:x.auctions,pricedQuantity:x.pricedQuantity??null,warnings:x.warnings??[],weightedMeanExact:x.meanExact??null,weightedMedianExact:x.medianExact??null,totalQuantityExact:x.quantityExact??null,variantCount:x.variantCount??null}));
 if(rows.some(x=>!ids.includes(x.id)))throw new CollectionError('cached_basket_mismatch');
 return {meta,metrics:{basket:rows}};
}
async function siteJson(path,{fetchFn,headers,method='GET',body}){
 let r;try{r=await fetchFn(SITE_URL+path,{method,redirect:'error',headers:{...headers,...body?{'Content-Type':'application/json'}:{}},...body?{body:JSON.stringify(body)}:{},signal:AbortSignal.timeout(120000)});}catch{throw new CollectionError('site_transport');}
 if(!r.ok)throw new CollectionError('site_http',r.status);
 try{return await r.json();}catch{throw new CollectionError('site_invalid_json');}
}
async function downloadFeed(market,kind,{fetchFn,token,cache,ids,now,sleep}){
 const url=apiUrl(market,kind),previous=cachedFeed(cache,kind,ids);
 const headers={Authorization:'Bearer '+token,'Cache-Control':'no-cache',Accept:'application/json'};
 if(previous?.meta.etag)headers['If-None-Match']=previous.meta.etag;
 else if(previous?.meta.at)headers['If-Modified-Since']=new Date(previous.meta.at).toUTCString();
 let response;
 for(let attempt=0;attempt<2;attempt++){
  try{response=await fetchFn(url,{redirect:'error',headers,signal:AbortSignal.timeout(60000)});}catch{if(attempt)throw new CollectionError('provider_transport',null,kind);await sleep(2000);continue;}
  const header=response.headers.get('Retry-After'),delay=header?(Number.isFinite(Number(header))?Number(header)*1000:Date.parse(header)-now()):2000;
  if(response.status>=500&&!attempt&&Number.isFinite(delay)&&delay<=20000){await sleep(Math.max(0,delay));continue;}
  break;
 }
 const receivedAt=now();
 if(response.status===304){
  if(!previous)throw new CollectionError('not_modified_without_cached_snapshot',304,kind);
  return {...previous,meta:{...previous.meta,status:304,retrievedAt:receivedAt}};
 }
 if(!response.ok){const h=response.headers.get('Retry-After');const retryAt=h?(Number.isFinite(Number(h))?receivedAt+Number(h)*1000:Date.parse(h)):null;throw new CollectionError('provider_http',response.status,kind,Number.isFinite(retryAt)?retryAt:null);}
 if(response.headers.get('battlenet-namespace')!==market.namespace||response.headers.get('battlenet-schema')!=='auctions')throw new CollectionError('provider_response_scope',response.status,kind);
 const at=sourceDate(response.headers.get('last-modified'));
 if(at===null||at>receivedAt+300000||at<Date.parse('2026-11-05T00:00:00Z')||previous&&at<previous.meta.at)throw new CollectionError('provider_timestamp_invalid',response.status,kind);
 let text;try{text=await response.text();}catch{throw new CollectionError('provider_body_transport',response.status,kind);}
 let body;try{body=JSON.parse(text);}catch{throw new CollectionError('provider_invalid_json',response.status,kind);}
 const sha256=createHash('sha256').update(text).digest('hex');text=null;
 const rows=validateFeedDocument(body,market,kind,url);
 const metrics=summarizeListings(rows,{kind,itemIds:ids});body=null;
 return {meta:{kind,status:200,at,retrievedAt:receivedAt,url,sha256,etag:response.headers.get('etag'),cacheControl:response.headers.get('cache-control'),date:response.headers.get('date'),age:response.headers.get('age'),expires:response.headers.get('expires'),sourceTimeHeader:response.headers.get('last-modified')},metrics};
}
export async function runBlizzardCollection({applicationToken,siteAccessToken,fetchFn=fetch,now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms)),log=()=>{},only,force=false}={}){
 if(typeof applicationToken!=='string'||!/^[a-f0-9]{64}$/.test(applicationToken))throw new CollectionError('invalid_application_access');
 const headers={Authorization:'Bearer '+applicationToken,...siteAccessToken?{'OAI-Sites-Authorization':'Bearer '+siteAccessToken}:{}};
 const context={fetchFn,headers};
 const config=await siteJson('/api/blizzard/config',context),ids=config.itemIds;
 if(!validIds(ids)||typeof config.basketVersion!=='string')throw new CollectionError('invalid_published_basket');
 const configured=Array.isArray(config.markets)?config.markets:markets;
 let selected=configured.filter(row=>row.available&&marketById(row.id)?.physicalKey===row.physicalKey);
 if(only){selected=selected.filter(x=>x.id===only);if(!selected.length)throw new CollectionError('unknown_or_unavailable_market');}
 if(new Set(selected.map(x=>x.physicalKey)).size!==selected.length)throw new CollectionError('duplicate_physical_house');
 const status=new Map((config.collectionStatus??[]).map(x=>[x.market,x]));
 const nextCheckAt=nearDeadline(selected,status,now());
 const due=selected.filter(row=>force||now()>=dueAt(status.get(row.id),now()));
 const results=[];
 if(!due.length){const summary={provider:'Blizzard',complete:true,expectedItems:ids.length,configuredMarkets:configured.length,collectibleMarkets:selected.length,dueMarkets:0,skippedMarkets:selected.length,unsupportedMarkets:configured.filter(x=>!x.available).length,newSnapshots:0};log(summary);return {summary,results,nextCheckAt};}
 let access=await siteJson('/api/blizzard/access',{...context,method:'POST',body:{purpose:'hourly_watchlist'}});
 if(typeof access.accessToken!=='string'||!access.accessToken)throw new CollectionError('missing_provider_access');
 let token=access.accessToken;access=null;
 let stop=false;
 try{
  // Bound memory by releasing full auction JSON before the next feed. One
  // physical house at a time avoids multiplying large arrays in the runner.
  for(const candidate of due){
   if(stop)break;
   const market=marketById(candidate.id);
   try{
    const prior=await siteJson('/api/blizzard/config?market='+encodeURIComponent(market.id),context);
    // A new basket must be recomputed from full source documents even when
    // the provider snapshot is unchanged; old per-item summaries are partial.
    const cache=prior.cache?.basketVersion===config.basketVersion?prior.cache:null,feeds=[];
    for(const kind of ['auction','commodity'])feeds.push(await downloadFeed(market,kind,{fetchFn,token,cache,ids,now,sleep}));
    const items=composeItems(ids,feeds),retrievedAt=now();
    const payload={schemaVersion:1,market:market.id,houseId:market.houseId,region:market.region,namespace:market.namespace,basketVersion:config.basketVersion,retrievedAt,feeds:feeds.map(x=>x.meta),items};
    const saved=await siteJson('/api/blizzard/ingest',{...context,method:'POST',body:payload});
    const read=await siteJson('/api/tensions?market='+encodeURIComponent(market.id),context);
    if(read.market!==market.id||String(read.provider).toLowerCase()!=='blizzard'||!Array.isArray(read.states)||read.states.length!==ids.length||new Set(read.states.map(x=>x.id)).size!==ids.length||ids.some(id=>!read.states.some(x=>x.id===id)))throw new CollectionError('persisted_basket_verification_failed');
    const checked=read.collection?.lastCheckedAt??read.calculatedAt??read.retrievedAt;
    if(Number.isFinite(checked)&&checked<retrievedAt-300000)throw new CollectionError('persisted_time_verification_failed');
    const r={market:market.id,physicalKey:market.physicalKey,provider:'Blizzard',mappingStatus:market.mappingStatus,evidenceStatus:market.evidenceStatus,verifiedReadback:true,expectedItems:ids.length,pricedItems:items.filter(x=>x.status==='OK').length,sourceTimes:feeds.map(x=>({kind:x.meta.kind,at:x.meta.at,status:x.meta.status})),sameSourceTime:feeds[0].meta.at===feeds[1].meta.at,newSnapshot:saved.unchanged!==true,newScans:saved.newScans??null,unchanged:saved.unchanged===true};results.push(r);log(r);
   }catch(error){
    const e=error instanceof CollectionError?error:new CollectionError('unexpected_collection_error');
    const r={market:market.id,physicalKey:market.physicalKey,verifiedReadback:false,code:e.code,status:e.status,feed:e.feed,retryAt:e.retryAt};results.push(r);log(r);
    if([401,403].includes(e.status))stop=true;
    try{await siteJson('/api/blizzard/ingest',{...context,method:'POST',body:{schemaVersion:1,market:market.id,houseId:market.houseId,region:market.region,namespace:market.namespace,basketVersion:config.basketVersion,retrievedAt:now(),error:{code:e.code,status:e.status,feed:e.feed,...Number.isSafeInteger(e.retryAt)&&e.retryAt>=now()?{retryAt:e.retryAt}:{}}}});}catch{}
    if(e.status===429)stop=true;
   }
  }
 }finally{token=null;}
 const verified=results.filter(x=>x.verifiedReadback),failed=results.filter(x=>!x.verifiedReadback);
 const summary={provider:'Blizzard',complete:results.length===due.length&&!failed.length,expectedItems:ids.length,configuredMarkets:configured.length,collectibleMarkets:selected.length,dueMarkets:due.length,verifiedMarkets:verified.length,failedMarkets:failed.length,notAttempted:due.length-results.length,skippedMarkets:selected.length-due.length,unsupportedMarkets:configured.filter(x=>!x.available).length,newSnapshots:verified.filter(x=>x.newSnapshot).length,pricedItems:verified.reduce((s,x)=>s+x.pricedItems,0)};
 log(summary);return {summary,results,nextCheckAt};
}
