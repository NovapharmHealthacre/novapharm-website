import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeDebt,normalizeRates,ingestTreasury,buildCountryLayer} from '../src/core/finance-market-intelligence.mjs';
const now='2026-11-27T09:00:00Z';
const debt={record_date:'2026-11-25',debt_held_public_amt:'30000000000000.01',intragov_hold_amt:'7000000000000.01',tot_pub_debt_out_amt:'37000000000000.02'};
const rate={record_date:'2026-10-31',security_type_desc:'Marketable',security_desc:'Treasury Notes',avg_interest_rate_amt:'3.25'};
test('debt preserves exact cents and reconciles components',()=>{
 const out=normalizeDebt(debt,now);assert.equal(out[2].decimalValue,'37000000000000.02');assert.equal(out[2].publicationStatus,'review_required');
 assert.throws(()=>normalizeDebt({...debt,tot_pub_debt_out_amt:'37000000000000.03'},now));
});
test('monthly interest rates are not market yields',()=>{
 const out=normalizeRates([rate,{...rate,record_date:'2026-09-30'}],now);
 assert.equal(out.length,1);assert.equal(out[0].value,3.25);assert.equal(out[0].metric,'average_outstanding_debt_interest_rate');assert.equal(out[0].executionEligible,false);
 assert.throws(()=>normalizeRates([rate,rate],now));
});
test('independent Treasury retrieval with failed source',async()=>{
 const out=await ingestTreasury({now:new Date(now),fetcher:async url=>String(url).includes('debt_to_penny')?{ok:true,text:async()=>JSON.stringify({data:[debt]})}:{ok:false,status:503}});
 assert.equal(out.observations.length,3);assert.equal(out.status[1].state,'failed');assert.equal(out.productionVerified,false);
});
const record=(country,period,value)=>({country,period,value,metric:'gdp_growth',source:'worldBank',unit:'percent',retrievedAt:now});
const layer=(observations,year=2025)=>buildCountryLayer({observations,countryCodes:['GBR','IND','USA'],metric:'gdp_growth',year,asOf:'2026-11-27'});
test('map ranking uses same reporting year, zero remains valid and missing remains null',()=>{
 const out=layer([record('GBR','2025',0),record('IND','2025',6),record('USA','2024',3),record('WLD','2025',9)]);
 assert.deepEqual(out.ranking.map(x=>x.country),['IND','GBR']);assert.equal(out.rows.find(x=>x.country==='USA').value,null);assert.equal(out.coverage.available,2);
});
test('stale layer is not ranked',()=>{const out=layer([record('GBR','2022',3)],2022);assert.equal(out.coverage.stale,1);assert.deepEqual(out.ranking,[]);});
test('conflicting observations fail closed',()=>assert.throws(()=>layer([record('GBR','2025',1),record('GBR','2025',2)])));
