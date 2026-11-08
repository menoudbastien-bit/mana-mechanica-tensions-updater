import test from 'node:test';
import assert from 'node:assert/strict';
import {discoverMarkets,refreshMarket,runUpdates,validateSnapshot,verifyHistory} from '../scripts/observatory/tensions-client.mjs';
const market='forever.normal.alliance.eu',other='forever.pvp.horde.us',t=1800000000000,applicationToken='a'.repeat(64);
function snapshot(id=market,at=t){return {market:id,calculatedAt:at,states:Array.from({length:75},(_,n)=>({market:id,id:n+1,observedAt:at-60000,lastAt:at-60000,availability:'available',reason:null,episodes:[]})),top:[],failures:[]};}
function network(steps){
 const calls=[];
 const fetchFn=async(url,options)=>{const expected=steps.shift();assert(expected,'Unexpected network request');const method=options.method??'GET';calls.push({url:String(url),method,headers:options.headers});assert.equal(method,expected.method??'GET');if(expected.error)throw new Error('simulated network disconnect');return new Response(JSON.stringify(expected.body),{status:expected.status??200,headers:{'content-type':'application/json'}});};
 return {fetchFn,calls,done:()=>assert.equal(steps.length,0)};
}
const before=snapshot(market,t-3600000),after=snapshot();
function options(n,waits=[]){return {applicationToken,fetchFn:n.fetchFn,now:()=>t+1000,sleep:async ms=>waits.push(ms)};}
test('discovers every Forever market once, primary market first',async()=>{
 const n=network([{body:{markets:[{game:'forever',id:other},{game:'classic',id:'classic.other'},{game:'forever',id:market}]}}]);
 assert.deepEqual((await discoverMarkets(n.fetchFn)).map(x=>x.id),[market,other]);n.done();
});
test('verifies hosted write and readback with application access only',async()=>{
 const n=network([{body:before},{method:'POST',body:after},{body:after}]);
 const r=await refreshMarket(market,options(n));assert.equal(r.verifiedReadback,true);assert.equal(r.unchanged,false);assert.equal(r.usable,75);assert.equal(n.calls[1].headers['OAI-Sites-Authorization'],undefined);n.done();
});
test('lost response after commit is recovered by reading, without duplicate POST',async()=>{
 const n=network([{body:before},{method:'POST',error:true},{body:after}]),waits=[];
 const r=await refreshMarket(market,options(n,waits));assert.equal(r.recovered,true);assert.equal(r.posts,1);assert.deepEqual(waits,[]);n.done();
});
test('uncommitted transport failure gets one retry, with two intervening reads and 20s pause',async()=>{
 const n=network([{body:before},{method:'POST',error:true},{body:before},{body:before},{method:'POST',body:after},{body:after}]),waits=[];
 const r=await refreshMarket(market,options(n,waits));assert.equal(r.posts,2);assert.deepEqual(waits,[20000]);n.done();
});
test('persistent transport error never exceeds two POST attempts',async()=>{
 const n=network([{body:before},{method:'POST',error:true},{body:before},{body:before},{method:'POST',error:true},{body:before}]);
 await assert.rejects(refreshMarket(market,options(n)),e=>e.code==='transport');assert.equal(n.calls.filter(c=>c.method==='POST').length,2);n.done();
});
test('401/403 stops the batch immediately and does not try the remaining market',async()=>{
 const n=network([{body:{markets:[{id:market,game:'forever'},{id:other,game:'forever'}]}},{body:before},{method:'POST',status:403,body:{error:'denied'}}]);
 const r=await runUpdates(options(n));assert.equal(r.summary.attempted,1);assert.equal(r.summary.notAttempted,1);assert.equal(r.results[0].status,403);assert.equal(r.summary.complete,false);n.done();
});
test('two markets run sequentially with 20s between them',async()=>{
 const b=snapshot(other,t-3600000),a=snapshot(other),n=network([{body:{markets:[{id:other,game:'forever'},{id:market,game:'forever'}]}},{body:before},{method:'POST',body:after},{body:after},{body:b},{method:'POST',body:a},{body:a}]),waits=[];
 const r=await runUpdates(options(n,waits));assert.equal(r.summary.verified,2);assert.deepEqual(r.results.map(x=>x.market),[market,other]);assert.deepEqual(waits,[20000]);n.done();
});
test('an unchanged calculation is reported as unchanged',async()=>{
 const n=network([{body:after},{method:'POST',body:{...after,unchanged:true}},{body:after}]);
 assert.equal((await refreshMarket(market,options(n))).unchanged,true);n.done();
});
test('market or calculatedAt mismatch fails verification without another POST',async()=>{
 const n=network([{body:before},{method:'POST',body:after},{body:snapshot(market,t+10)}]);
 await assert.rejects(refreshMarket(market,options(n)),e=>e.code==='calculated_at_mismatch');assert.equal(n.calls.filter(c=>c.method==='POST').length,1);n.done();
 assert.throws(()=>validateSnapshot(snapshot(other),market),e=>e.code==='market_mismatch');
});
test('duplicate item identities are rejected',()=>{
 const a=snapshot();a.states[1].id=a.states[0].id;assert.throws(()=>validateSnapshot(a,market),e=>e.code==='item_identity');
});
test('missing source data remains missing even when the calculation succeeds',async()=>{
 const a=snapshot();for(const s of a.states){s.observedAt=null;s.lastAt=null;s.availability='unknown';s.reason='stale_or_missing';}
 const n=network([{body:before},{method:'POST',body:a},{body:a}]),r=await refreshMarket(market,options(n));
 assert.equal(r.verifiedReadback,true);assert.equal(r.usable,0);assert.equal(r.missingObservations,75);assert.deepEqual(r.observations,[]);n.done();
});
function episode(){return {market,id:1,key:market+'-1-old',firstDetectedAt:t-3600000,endedAt:null,confirmations:1,events:[{at:t-60000,status:'new'}],lastSignal:{reference:{median:100,quantity:100},current:{median:120,quantity:50},priceAbs:20,quantityAbs:-50,pricePct:.2,quantityPct:-.5}};}
test('duplicate source confirmations and bad arithmetic are rejected',()=>{
 const a=snapshot();a.states[0].episodes=[episode()];validateSnapshot(a,market);
 a.states[0].episodes[0].events.push({at:t-60000,status:'persistent'});a.states[0].episodes[0].confirmations=2;
 assert.throws(()=>validateSnapshot(a,market),e=>e.code==='duplicate_confirmation');
 const b=snapshot();b.states[0].episodes=[episode()];b.states[0].episodes[0].lastSignal.quantityPct=0;
 assert.throws(()=>validateSnapshot(b,market),e=>e.code==='signal_arithmetic');
 delete b.states[0].episodes[0].lastSignal.quantityPct;
 assert.throws(()=>validateSnapshot(b,market),e=>e.code==='signal_arithmetic');
});
test('prior detection times and history cannot be discarded or rewritten',()=>{
 const a=snapshot(),b=snapshot();a.states[0].episodes=[episode()];
 assert.throws(()=>verifyHistory(a,b),e=>e.code==='history_changed');
 b.states[0].episodes=[episode()];verifyHistory(a,b);b.states[0].episodes[0].firstDetectedAt++;
 assert.throws(()=>verifyHistory(a,b),e=>e.code==='history_changed');
});
