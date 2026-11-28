import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWorldBank,parseEcbReferenceRates,crossRate,ingest} from '../src/core/finance-public-data.mjs';
const time='2026-11-27T09:00:00Z';
const code='NY.GDP.MKTP.KD.ZG';
const row=(country,date,value)=>({countryiso3code:country,date,value,indicator:{id:code}});
const xml="<Cube time='2026-11-26'>"+['GBP','USD','INR','JPY','CAD','AUD','CHF','CNY','NOK','SEK'].map((c,i)=>"<Cube currency='"+c+"' rate='"+(i===0?0.8:i===1?1.2:i+1)+"'/>").join('')+"</Cube>";
test('latest nonnull annual observation; aggregates excluded',()=>{
 const out=normalizeWorldBank([row('GBR','2025',null),row('GBR','2024',0),row('GBR','2023',1),row('WLD','2025',5)],code,new Set(['GBR']),time);
 assert.equal(out.length,1);assert.equal(out[0].value,0);assert.equal(out[0].period,'2024');assert.equal(out[0].publicationStatus,'review_required');
});
test('reject conflicting latest observations',()=>assert.throws(()=>normalizeWorldBank([row('GBR','2024',1),row('GBR','2024',2)],code,new Set(['GBR']),time)));
test('ECB rates and derived GBP USD, information only',()=>{
 const out=parseEcbReferenceRates(xml,time);assert.equal(out.length,11);assert.ok(Math.abs(crossRate(out,'GBP','USD').value-1.5)<1e-10);assert.equal(crossRate(out,'GBP','USD').executionEligible,false);assert.equal(crossRate(out,'GBP','ZAR'),null);
});
test('reject bad ECB response',()=>{assert.throws(()=>parseEcbReferenceRates('<html>error</html>',time));assert.throws(()=>parseEcbReferenceRates(xml.replace("2026-11-26","2026-12-01"),time));assert.throws(()=>parseEcbReferenceRates(xml.replace("rate='0.8'","rate='0'"),time));});
test('publisher failure is not manufactured data',async()=>{
 const result=await ingest({fetcher:async()=>({ok:false,status:503}),now:new Date(time)});
 assert.deepEqual(result.observations,[]);assert.equal(result.status.length,2);assert.ok(result.status.every(s=>s.state==='failed'));assert.equal(result.productionVerified,false);
});
test('independent source retrieval, no publication or trading authority',async()=>{
 const result=await ingest({fetcher:async(url)=>String(url).includes('ecb.europa.eu')?{ok:true,text:async()=>xml}:{ok:false,status:503},now:new Date(time)});
 assert.equal(result.observations.length,11);assert.equal(result.publicationApproved,false);assert.equal(result.paidServices,false);
});
