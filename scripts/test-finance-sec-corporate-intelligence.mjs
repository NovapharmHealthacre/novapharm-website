import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeCompanyFacts,ingestCompanyFacts} from '../src/core/finance-sec-corporate-intelligence.mjs';
const retrievedAt='2026-11-27T09:00:00Z',asOf='2025-12-31',cik='123';
const row={start:'2024-01-01',end:'2024-12-31',filed:'2025-02-01',form:'10-K',accn:'0000000123-25-000001',val:100000};
const sample=(rows=[row])=>({cik:123,entityName:'Fixture issuer',facts:{'us-gaap':{Revenues:{units:{USD:rows}}}}});
const norm=payload=>normalizeCompanyFacts({payload,cik,asOf,retrievedAt});
test('preserve source filing, currency and period',()=>{
 const [x]=norm(sample());assert.equal(x.value,100000);assert.equal(x.cik,'0000000123');assert.equal(x.unit,'USD');assert.equal(x.accession,row.accn);assert.equal(x.start,row.start);
});
test('exclude later filings, unsafe integers and malformed values',()=>{
 assert.equal(norm(sample([row,{...row,filed:'2026-02-01'},{...row,val:NaN},{...row,val:9007199254740992}])).length,1);
});
test('conflicting same-filing facts rejected; identical facts deduplicated',()=>{
 assert.equal(norm(sample([row,row])).length,1);assert.throws(()=>norm(sample([row,{...row,val:20}])));
});
test('keep amendments separate, do not silently overwrite original',()=>{
 const r={...row,form:'10-K/A',filed:'2025-03-01',accn:'0000000123-25-000002',val:200};
 const x=norm(sample([row,r]));assert.equal(x.length,2);assert.equal(x[0].value,200);
});
test('reject mismatched issuer or future as-of date',()=>{
 assert.throws(()=>norm({...sample(),cik:456}));assert.throws(()=>normalizeCompanyFacts({payload:sample(),cik,asOf:'2027-01-01',retrievedAt}));
});
test('fetch public data with declared contact and bounded stream',async()=>{
 let request;
 const x=await ingestCompanyFacts({cik,contact:'Example Org ops@example.org',now:new Date(retrievedAt),asOf,fetcher:async(url,opts)=>{request={url,opts};return new Response(JSON.stringify(sample()));}});
 assert.equal(x.state,'retrieved');assert.equal(x.facts.length,1);assert.equal(x.productionVerified,false);assert.equal(x.publicationApproved,false);assert.ok(request.url.endsWith('CIK0000000123.json'));assert.equal(request.opts.headers['User-Agent'],'Example Org ops@example.org');
});
test('rate limit does not manufacture facts or retry automatically',async()=>{
 let requests=0;const x=await ingestCompanyFacts({cik,contact:'Example Org ops@example.org',now:new Date(retrievedAt),fetcher:async()=>{requests++;return new Response(null,{status:429});}});
 assert.equal(requests,1);assert.equal(x.state,'failed');assert.deepEqual(x.facts,[]);
});
test('reject invalid CIK and contact before request',async()=>{
 const fetcher=()=>{throw Error('must not fetch');};
 await assert.rejects(ingestCompanyFacts({cik:'../x',contact:'Example Org ops@example.org',fetcher}),/Invalid SEC CIK/);
 await assert.rejects(ingestCompanyFacts({cik,contact:'anonymous',fetcher}),/fair access/);
});
