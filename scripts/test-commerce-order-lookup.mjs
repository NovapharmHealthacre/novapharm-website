import test from 'node:test';
import {runInNewContext} from 'node:vm';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const read=path=>readFileSync(path,'utf8');
test('unified order lookup is generated in public release output',()=>{
 const html=read('products/track/index.html');
 assert.match(html,/data-np-order-lookup/);
 assert.match(html,/Follow your order/);
 assert.match(html,/<meta name="robots" content="noindex, follow">/);
 assert.match(html,/property="og:url" content="https:\/\/novapharmhealthcare.com\/products\/track\/"/);
 assert.doesNotMatch(html,/property="og:url" content="https:\/\/novapharmhealthcare.com\/products\/"/);

 assert.match(html,/Only the order state is retrieved/);
 assert.match(html,/assets\/js\/commerce-order-track\.js/);
 assert.match(html,/assets\/css\/commerce-order-track\.css/);
 assert.equal((html.match(/<main\b/g)||[]).length,1);
 assert(existsSync('assets/js/commerce-order-track.js'));
});
test('both public product surfaces link to unified tracking route',()=>{
 const source=read('products/index.html'),market=read('products/marketplace/index.html');
 assert.match(source,/href="\/products\/track\/"/);
 assert.match(market,/href="\/products\/track\/"/);
});
test('existing API origins and opaque order reference formats are preserved',()=>{
 const source=read('assets/js/commerce-order-track.js');
 assert.match(source,/7cs8kxkj5d\.execute-api\.eu-north-1\.amazonaws\.com/);
 assert.match(source,/vflz5z5jfc\.execute-api\.eu-north-1\.amazonaws\.com/);
 assert.match(source,/order-request-status/);
 assert.match(source,/const UUID=/);
 assert.match(source,/const NUT=/);
 assert.match(source,/const API=/);
 assert.match(source,/status\//);
});
test('tracking UI does not collect payment, send email or store customer data',()=>{
 const script=read('assets/js/commerce-order-track.js');
 const html=read('products/track/index.html');
 assert.doesNotMatch(script,/checkout\.sessions|send_email|localStorage|sessionStorage|credentials:"include"|sk_live_/);
 assert.doesNotMatch(html,/type="email"|type="password"|data-payment-intent/);
 assert.match(script,/credentials:"omit"/);
 assert.match(script,/textContent/);
});

test('order lookup explains next steps without inventing fulfilment and clears stale advice',async()=>{
 const ref='NUT-12345678-1234-4234-8234-123456789abc';
 let submit,reply='PAID',requests=0;
 const form={addEventListener:(type,fn)=>{assert.equal(type,'submit');submit=fn;}};
 const input={value:ref},status={hidden:true,textContent:'',dataset:{}},next={hidden:true,textContent:''},button={disabled:false};
 const selectors={'form':form,"input[name='order_ref']":input,'[data-np-order-status]':status,'button[type=\'submit\']':button,'[data-np-order-next]':next};
 runInNewContext(read('assets/js/commerce-order-track.js'),{
   document:{querySelector:()=>({querySelector:s=>selectors[s]})},
   fetch:async(url,options)=>{requests++;assert.equal(options.credentials,'omit');assert.ok(url.endsWith('/'+ref));return {ok:true,json:async()=>({orderId:ref,status:reply})};},
 });
 const event={preventDefault(){}};
 await submit(event);
 assert.equal(status.textContent,'Payment confirmed.');
 assert.match(next.textContent,/not dispatch/);
 assert.equal(next.hidden,false);
 reply='CHECKOUT_EXPIRED';await submit(event);
 assert.match(next.textContent,/new payment link/);
 reply='UNKNOWN';await submit(event);
 assert.equal(next.hidden,true);assert.equal(next.textContent,'');
 input.value='invalid';await submit(event);
 assert.equal(requests,3);assert.equal(next.hidden,true);
 assert.equal(button.disabled,false);
});
