import {createInterface} from 'node:readline';
import {once} from 'node:events';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {summarizeListings} from './blizzard-listing-metrics.mjs';

const ORIGIN='https://eu.api.blizzard.com',NS='dynamic-forever-eu';
const report={protocolVersion:'blizzard-probe-v1',startedAt:new Date().toISOString(),provider:'Blizzard Battle.net API',namespace:NS,region:'eu',candidateHouseId:111,mappingStatus:'candidate_unverified',admittedToObservatory:false,requests:[]};
let token,credentials;
function approvedUrl(value){
 const u=new URL(value,ORIGIN);
 if(u.origin!==ORIGIN||u.username||u.password||u.hash||!u.pathname.startsWith('/data/wow/'))throw Error('Unexpected API destination');
 const namespaces=u.searchParams.getAll('namespace');if(namespaces.some(ns=>ns!==NS))throw Error('Unexpected API namespace');
 u.searchParams.set('namespace',NS);u.searchParams.set('locale','en_GB');return u;
}
async function getDocument(value){
 const url=approvedUrl(value),r=await fetch(url,{redirect:'error',headers:{Authorization:'Bearer '+token},signal:AbortSignal.timeout(45000)});
 const meta={url:url.href,status:r.status,retrievedAt:new Date().toISOString(),headers:Object.fromEntries(['date','age','expires','cache-control','last-modified','etag','battlenet-namespace','battlenet-schema','retry-after'].map(k=>[k,r.headers.get(k)]))};
 const maxAge=meta.headers['cache-control']?.match(/(?:^|,)\s*max-age=(\d+)/i)?.[1],age=Number(meta.headers.age??0);
 // Informational cache-reuse estimate, never a minimum request interval.
 if(maxAge!==undefined&&Number.isFinite(age))meta.cacheReuseUntilEstimate=new Date(Date.parse(meta.retrievedAt)+Math.max(0,Number(maxAge)-age)*1000).toISOString();
 report.requests.push(meta);
 if(!r.ok)throw Error('Blizzard response HTTP '+r.status);
 if(meta.headers['battlenet-namespace']!==NS)throw Error('Response namespace did not validate');
 const expectedSchema=url.pathname.includes('/auctions')?'auctions':'ruleset';
 if(meta.headers['battlenet-schema']!==expectedSchema)throw Error('Response schema did not validate');
 const body=await r.json();
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('Unexpected document shape');
 meta.keys=Object.keys(body);
 const observed=Date.parse(meta.headers['last-modified']);meta.sourceTimeValid=Number.isFinite(observed)&&observed<=Date.parse(meta.retrievedAt)+300000;
 if(!meta.sourceTimeValid)throw Error('Source timestamp did not validate');
 console.log(JSON.stringify({stage:'received',url:url.href,status:r.status,source:meta.headers['last-modified'],keys:meta.keys}));
 return {body,meta};
}
if(process.stdin.isTTY)spawnSync('stty',['-echo'],{stdio:['inherit','ignore','ignore']});
console.log('Ready for Blizzard application credentials on hidden stdin.');
const input=createInterface({input:process.stdin,terminal:false});
try{const [line]=await once(input,'line');credentials=JSON.parse(line);}catch{credentials=null;}finally{input.close();process.stdin.pause();if(process.stdin.isTTY)spawnSync('stty',['echo'],{stdio:['inherit','ignore','ignore']});}
try{
 if(typeof credentials?.clientId!=='string'||!credentials.clientId||typeof credentials?.clientSecret!=='string'||!credentials.clientSecret)throw Error('Application credentials missing or invalid');
 const authResponse=await fetch('https://oauth.battle.net/token',{method:'POST',redirect:'error',headers:{Authorization:'Basic '+Buffer.from(credentials.clientId+':'+credentials.clientSecret).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'client_credentials'}),signal:AbortSignal.timeout(30000)});
 let auth=await authResponse.json().catch(()=>null);credentials=null;
 report.authentication={status:authResponse.status,expiresIn:auth?.expires_in};
 if(!authResponse.ok||typeof auth?.access_token!=='string')throw Error('Application authentication failed');
 token=auth.access_token;auth=null;
 const catalogueResponse=await fetch('https://mana-mechanica.com/observatory-catalog.json',{redirect:'error',signal:AbortSignal.timeout(30000)});
 if(!catalogueResponse.ok)throw Error('Current watchlist unavailable');
 const catalogue=await catalogueResponse.json(),itemIds=catalogue.items?.map(x=>x.id);
 if(!Array.isArray(itemIds)||!itemIds.length||itemIds.some(id=>!Number.isSafeInteger(id)||id<=0)||new Set(itemIds).size!==itemIds.length)throw Error('Watchlist identity did not validate');
 report.basketItems=itemIds.length;report.basketVersion=catalogue.version??null;report.basketIdSha256=createHash('sha256').update(JSON.stringify(itemIds)).digest('hex');
 const index=await getDocument('/data/wow/ruleset/index');
 const normal=index.body.rulesets?.find(x=>x.id===2);
 if(!normal?.key?.href)throw Error('Normal ruleset link unavailable');
 const ruleset=await getDocument(normal.key.href);
 if(ruleset.body.id!==2)throw Error('Ruleset response identity mismatch');
 report.ruleset={id:ruleset.body.id,name:ruleset.body.name};
 const houseIndexLink=ruleset.body.auctions?.href??ruleset.body.auctions?.key?.href;
 if(!houseIndexLink)throw Error('Auction index link unavailable');
 const houses=await getDocument(houseIndexLink);
 if(!Array.isArray(houses.body.auctions))throw Error('Unexpected auction index shape');
 report.houses=houses.body.auctions.map(({id,name,key})=>({id,name,href:key?.href}));
 const candidate=houses.body.auctions.find(x=>x.id===111);
 if(!candidate||!/^Alliance Auction House$/i.test(candidate.name))throw Error('Candidate Alliance house did not validate');
 const houseUrl=candidate.key?.href??candidate.href;
 if(!houseUrl)throw Error('Auction house link unavailable');
 let house=await getDocument(houseUrl);
 if(house.body.id!==111||!Array.isArray(house.body.auctions))throw Error('Unexpected auction house response');
 if(house.body.ruleset?.id!==undefined&&house.body.ruleset.id!==2)throw Error('Auction ruleset mismatch');
 if(house.body.name!==undefined&&!/^Alliance Auction House$/i.test(house.body.name))throw Error('Auction faction mismatch');
 report.auctions={source:house.meta,metrics:summarizeListings(house.body.auctions,{kind:'auction',itemIds})};
 let commodities;
 if(Array.isArray(house.body.commodities))commodities={body:{auctions:house.body.commodities},meta:house.meta};
 else{
  const link=house.body.commodities?.href??house.body.commodities?.key?.href;
  const documentedUrl=approvedUrl(houseUrl);documentedUrl.pathname=documentedUrl.pathname.replace(/\/$/,'')+'/commodities';
  commodities=await getDocument(link??documentedUrl.href);
 }
 house=null;
 if(!Array.isArray(commodities.body.auctions))throw Error('Unexpected commodities response');
 report.commodities={source:commodities.meta,metrics:summarizeListings(commodities.body.auctions,{kind:'commodity',itemIds})};
 report.sameSourceTime=Date.parse(report.auctions.source.headers['last-modified'])===Date.parse(report.commodities.source.headers['last-modified']);
 const auctionBasket=report.auctions.metrics.basket,commodityBasket=report.commodities.metrics.basket;
 const priced=entry=>entry.min!==null&&entry.weightedMedian!==null;
 report.coverage={pricedItems:new Set([...auctionBasket,...commodityBasket].filter(priced).map(entry=>entry.id)).size,observedItems:new Set([...auctionBasket,...commodityBasket].filter(entry=>entry.observed).map(entry=>entry.id)).size,overlapItems:auctionBasket.filter(entry=>entry.observed&&commodityBasket.find(other=>other.id===entry.id)?.observed).length,comparableFeeds:report.sameSourceTime};
 report.complete=true;
}catch(error){
 report.complete=false;
 const safeMessages=new Set(['Unexpected API destination','Unexpected API namespace','Response namespace did not validate','Response schema did not validate','Unexpected document shape','Source timestamp did not validate','Application credentials missing or invalid','Application authentication failed','Current watchlist unavailable','Watchlist identity did not validate','Normal ruleset link unavailable','Ruleset response identity mismatch','Auction index link unavailable','Unexpected auction index shape','Candidate Alliance house did not validate','Auction house link unavailable','Unexpected auction house response','Auction ruleset mismatch','Auction faction mismatch','Unexpected commodities response','Invalid listing-metrics input','Invalid listing identity','Conflicting duplicate listing ID']);
 report.error=error.name==='TimeoutError'?'Request timeout':safeMessages.has(error.message)||/^Blizzard response HTTP \d{3}$/.test(error.message)?error.message:'Diagnostic request failed';
 process.exitCode=1;
}
finally{credentials=null;token=null;report.completedAt=new Date().toISOString();}
// Emit only audit metadata and counts. Never print individual listings, account
// data, credentials, tokens or the full per-item calculated basket.
for(const feed of ['auctions','commodities'])if(report[feed]?.metrics){
 const {basket,...metrics}=report[feed].metrics;
 report[feed].metrics={...metrics,observedBasketItems:basket.filter(entry=>entry.observed).length,pricedBasketItems:basket.filter(entry=>entry.min!==null&&entry.weightedMedian!==null).length,multipleVariantBasketItems:basket.filter(entry=>entry.variantCount>1).length};
}
console.log(JSON.stringify({finalReport:report}));
