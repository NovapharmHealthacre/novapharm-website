import assert from "node:assert/strict";
import {test} from "node:test";
import {pharmacyComparison} from "../assets/js/pharmacy-partners.js";
import {publicAnalyticsRoute} from "../assets/js/consent-analytics.js";
test("default comparison is VAT adjusted and scales across branches",()=>{
 const a=pharmacyComparison({retail:18.38,current:38,proposed:47.1,units:100,branches:1});
 assert.equal(a.old.toFixed(2),"582.03");
 assert.equal(a.next.toFixed(2),"721.42");
 assert.equal(a.difference.toFixed(2),"1672.58");
 assert.equal(pharmacyComparison({retail:18.38,current:38,proposed:47.1,units:100,branches:10}).difference.toFixed(2),"16725.80");
});
test("comparison handles invalid input and lower margins",()=>{
 assert.equal(pharmacyComparison({retail:-5,current:38,proposed:45,units:10,branches:1}).difference,0);
 assert.ok(pharmacyComparison({retail:18,current:45,proposed:40,units:10,branches:1}).difference<0);
});
test("only exact public pharmacy campaign route is allowed",()=>{
 assert.equal(publicAnalyticsRoute("/pharmacy-partners/"),true);
 assert.equal(publicAnalyticsRoute("/pharmacy-partners/account/"),false);
 assert.equal(publicAnalyticsRoute("/account-application/"),false);
});
