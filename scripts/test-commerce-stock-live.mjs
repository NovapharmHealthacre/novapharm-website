import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(p,'utf8');
test('DynamoDB-only public stock API is read-only, source-scoped and throttled',()=>{
 const tpl=JSON.parse(read('infra/aws/commerce-stock-public-production.json'));
 const st=tpl.Resources.StockRole.Properties.Policies[0].PolicyDocument.Statement;
 assert.deepEqual(st[0].Action,['dynamodb:BatchGetItem']);
 assert.equal(st[0].Resource.length,2);
 assert(st[0].Resource.every(v=>v.includes('novapharm-production-')&&v.endsWith('-inventory')));
 assert(!JSON.stringify(st).includes('dynamodb:UpdateItem'));
 assert(!JSON.stringify(st).includes('secretsmanager:GetSecretValue'));
 assert.deepEqual(tpl.Resources.HttpApi.Properties.CorsConfiguration.AllowOrigins,[
   'https://novapharmhealthcare.com','https://www.novapharmhealthcare.com'
 ]);
 const settings=tpl.Resources.Stage.Properties.DefaultRouteSettings;
 assert(settings.ThrottlingRateLimit<=20&&settings.ThrottlingBurstLimit<=40);
});
test('API exposes owner confirmation, never independently audited or payment authorization',()=>{
 const code=read('apps/commerce-stock-api/index.py');
 assert.match(code,/if not 1<=len\(skus\)<=24/);
 assert.match(code,/NUT-UK-/);
 assert.match(code,/NP-ESCO-/);
 assert.match(code,/ConsistentRead/);
 assert.match(code,/"independentAudit":False/);
 assert.match(code,/"checkoutAuthority":False/);
 assert.match(code,/"ownerConfirmedRemainingUnits"/);
 assert.doesNotMatch(code,/create_checkout_session|stripe\.com|put_item|update_item|send_email/);
});
test('marketplace dynamically reads confirmed stock from HTTPS without embedding financial secrets',()=>{
 const source=read('assets/js/commerce-marketplace.js');
 assert.match(source,/https:\/\/eyoj5e64zb\.execute-api\.eu-north-1\.amazonaws\.com/);
 assert.match(source,/stockEvidence==='owner_confirmed_not_independently_audited'/);
 assert.match(source,/stockCache=new Map\(\)/);
 assert.match(source,/Owner-confirmed warehouse stock/);
 assert.match(source,/product-specific approval/);
 assert.doesNotMatch(source,/sk_live_|whsec_|OPENAI_API_KEY|MONGODB_URI|aws_secret_access_key/);
});
test('public data generator publishes accurate owner-confirmation and separate checkout status',()=>{
 const script=read('scripts/generate-commerce-marketplace.mjs');
 assert.match(script,/inventoryAuthority:'aws_dynamodb_owner_confirmed_read_only'/);
 assert.match(script,/NovaPharm confirms 10,000 warehouse units per catalogue record/);
 assert.match(script,/notPaymentAuthority:true/);
 assert.match(script,/availabilityQuantity:null/);
});
