import test from 'node:test';
import assert from 'node:assert/strict';
import {apiUrl,composeItems,dueAt,runBlizzardCollection,validateFeedDocument} from '../scripts/blizzard/collector.mjs';
import {markets,collectibleMarkets,marketById} from '../lib/blizzard/markets.mjs';
const market=marketById('forever.normal.alliance.eu'),now=Date.parse('2026-11-22T18:30:00Z'),at=now-7*60000;
const reply=(body,status=200,headers={})=>new Response(status===304?null:JSON.stringify(body),{status,headers:{'Content-Type':'application/json',...headers}});
const document=(kind,rows)=>({_links:{self:{href:apiUrl(market,kind)}},...kind==='auction'?{id:111,ruleset:{id:2}}:{},auctions:rows});
test('registry retains unsupported scopes and collects each of 36 physical houses once',()=>{
 assert.equal(markets.length,54);assert.equal(collectibleMarkets.length,36);assert.equal(new Set(collectibleMarkets.map(x=>x.physicalKey)).size,36);
 assert.equal(collectibleMarkets.filter(x=>x.faction==='neutral').length,12);
 assert.equal(marketById('forever.normal.alliance.cn').available,false);
 assert.notEqual(marketById('forever.normal.alliance.kr').physicalKey,marketById('forever.normal.alliance.tw').physicalKey);
 assert.equal(marketById('forever.rp.alliance.eu').evidenceStatus,'inferred');
});
test('poll phase follows source time while stale data backs off without implying new scans',()=>{
 assert.equal(dueAt({sourceAt:at,lastCheckedAt:now},now),at+3600000+60000);
 assert.equal(dueAt({sourceAt:now-4*3600000,lastCheckedAt:now},now),now+15*60000);
 assert.equal(dueAt({retryNotBefore:now+60000},now),now+60000);
});
test('feed identity rejects wrong region and house; verified empty documents do not invent item stock',()=>{
 assert.throws(()=>validateFeedDocument({...document('auction',[]),id:114},market,'auction',apiUrl(market,'auction')),/house_identity/);
 assert.throws(()=>validateFeedDocument({...document('auction',[]),name:'Horde Auction House'},market,'auction',apiUrl(market,'auction')),/house_faction/);
 assert.throws(()=>validateFeedDocument({_links:{self:{href:apiUrl(market,'commodity').replace('eu.api','us.api')}}},market,'commodity',apiUrl(market,'commodity')),/identity/);
 const empty=document('auction',[]);delete empty.auctions;assert.deepEqual(validateFeedDocument(empty,market,'auction',apiUrl(market,'auction')),[]);
 const row=composeItems([7],[])[0];assert.equal(row.status,'INDISPONIBLE');assert.equal(row.quantity,null);assert.equal(row.min,null);
});
test('an item present in both source feeds is withheld rather than double counted',()=>{
 const row={id:7,observed:true,min:100,weightedMedian:100,weightedMean:100,totalQuantity:2,totalAuctions:2,pricedQuantity:2,warnings:[]};
 const feeds=['auction','commodity'].map(kind=>({meta:{kind,at},metrics:{basket:[row]}}));
 const item=composeItems([7],feeds)[0];assert.equal(item.quantity,null);assert.deepEqual(item.warnings,['cross_feed_overlap']);
});
function transport({status=200,scope='dynamic-forever-eu',cache=null,collectionStatus=[]}={}){
 let saved=null,external=0,failures=0,accessCalls=0;const requests=[];
 const fetchFn=async(url,options={})=>{
  requests.push([String(url),options]);const u=new URL(url);
  if(u.origin==='https://mana-mechanica.com'){
   if(u.pathname==='/api/blizzard/config')return reply(u.searchParams.has('market')?{cache}:{itemIds:[7,8],basketVersion:'test-basket',markets:[market],collectionStatus});
   if(u.pathname==='/api/blizzard/access'){accessCalls++;return reply({accessToken:'ephemeral-test-token'});}
   if(u.pathname==='/api/blizzard/ingest'){const body=JSON.parse(options.body);if(body.error){failures++;return reply({recordedFailure:true});}saved=body;return reply({unchanged:false,newScans:2});}
   if(u.pathname==='/api/tensions')return reply({market:market.id,provider:'Blizzard',calculatedAt:now,collection:{lastCheckedAt:now},states:saved.items.map(x=>({id:x.id}))});
   throw Error('Unknown fixture path');
  }
  external++;if(status!==200)return reply(null,status);
  const kind=u.pathname.endsWith('/commodities')?'commodity':'auction';
  return reply(document(kind,kind==='auction'?[{id:1,item:{id:7},quantity:1,buyout:100}]:[{id:2,item:{id:8},quantity:3,unit_price:201}]),200,{'battlenet-namespace':scope,'battlenet-schema':'auctions','last-modified':new Date(at).toUTCString(),'cache-control':'public, max-age=86400'});
 };
 return {fetchFn,requests,get saved(){return saved;},get external(){return external;},get failures(){return failures;},get accessCalls(){return accessCalls;}};
}
const opts=fixture=>({applicationToken:'1'.repeat(64),fetchFn:fixture.fetchFn,now:()=>now,sleep:async()=>{},only:market.id,force:true});
test('real-shape fixture calculates, ingests and verifies both feeds with independent timestamps',async()=>{
 const f=transport(),r=await runBlizzardCollection(opts(f));assert.equal(r.summary.complete,true);assert.equal(r.summary.pricedItems,2);assert.equal(f.external,2);
 assert.equal(f.saved.items.find(x=>x.id===8).median,201);assert.equal(f.saved.items.find(x=>x.id===8).quantity,3);
 assert.ok(f.requests.filter(([u])=>u.includes('api.blizzard.com')).every(([,o])=>o.headers['Cache-Control']==='no-cache'));
 assert.ok(!JSON.stringify(r).includes('ephemeral-test-token'));
});
test('namespace mismatch records a technical failure and never ingests prices',async()=>{
 const f=transport({scope:'dynamic-forever-us'}),r=await runBlizzardCollection(opts(f));assert.equal(r.summary.complete,false);assert.equal(f.saved,null);assert.equal(f.failures,1);
});
test('not-modified without local original data is never treated as new prices',async()=>{
 const f=transport({status:304}),r=await runBlizzardCollection(opts(f));assert.equal(r.summary.complete,false);assert.equal(f.saved,null);assert.equal(r.results[0].code,'not_modified_without_cached_snapshot');
});
test('304 reuses the original item values and original source time',async()=>{
 const cache={basketVersion:'test-basket',feeds:['auction','commodity'].map(kind=>({kind,at,sha256:'a'.repeat(64),url:apiUrl(market,kind),status:200,retrievedAt:now-60000})),items:[{id:7,feed:'auction',at,min:100,median:100,mean:100,quantity:1,auctions:1,pricedQuantity:1,status:'OK',warnings:[]},{id:8,feed:'commodity',at,min:201,median:201,mean:201,quantity:3,auctions:1,pricedQuantity:3,status:'OK',warnings:[]}]};
 const f=transport({status:304,cache}),r=await runBlizzardCollection(opts(f));assert.equal(r.summary.complete,true);assert.equal(f.saved.items[0].at,at);assert.equal(f.saved.items[0].median,100);assert.ok(f.saved.feeds.every(x=>x.status===304));
});
test('a scheduler check before the source phase performs no OAuth or provider call',async()=>{
 const f=transport({collectionStatus:[{market:market.id,sourceAt:at,lastCheckedAt:now}]}),r=await runBlizzardCollection({...opts(f),force:false});assert.equal(r.summary.dueMarkets,0);assert.equal(f.accessCalls,0);assert.equal(f.external,0);
});
test('a withheld cross-feed conflict cannot be reconstructed from a composed 304 cache',async()=>{
 const cache={basketVersion:'test-basket',feeds:['auction','commodity'].map(kind=>({kind,at,sha256:'a'.repeat(64),url:apiUrl(market,kind)})),items:[{id:7,feed:null,at:null,min:null,median:null,mean:null,quantity:null,auctions:null,status:'INDISPONIBLE',warnings:['cross_feed_overlap']}]};
 const f=transport({status:304,cache}),r=await runBlizzardCollection(opts(f));
 assert.equal(r.summary.complete,false);assert.equal(f.saved,null);
 const sent=f.requests.find(([url])=>url.includes('api.blizzard.com'))[1].headers;
 assert.equal(sent['If-Modified-Since'],undefined);assert.equal(sent['If-None-Match'],undefined);
});
test('a changed basket invalidates conditional cache validators and recomputes all items',async()=>{
 const cache={basketVersion:'old-basket',feeds:['auction','commodity'].map(kind=>({kind,at,sha256:'a'.repeat(64),url:apiUrl(market,kind)})),items:[]};
 const f=transport({cache}),r=await runBlizzardCollection(opts(f));assert.equal(r.summary.complete,true);assert.equal(f.saved.items.length,2);
 for(const [,options] of f.requests.filter(([url])=>url.includes('api.blizzard.com'))){assert.equal(options.headers['If-Modified-Since'],undefined);assert.equal(options.headers['If-None-Match'],undefined);}
});

const {nearDeadline}=await import('../scripts/blizzard/collector.mjs');
{
 const now=Date.now(),h=3600000,m=60000,rows=[{id:'early'},{id:'near'},{id:'later'},{id:'blocked'}];
 const status=new Map([['early',{sourceAt:now-2*h}],['near',{sourceAt:now-h+3*m}],['later',{sourceAt:now-h+8*m}],['blocked',{sourceAt:now-h,retryNotBefore:now+30*m}]]);
 assert.equal(nearDeadline(rows,status,now),now+9*m);
 assert.equal(nearDeadline([rows[0],rows[3]],status,now),null);
}
