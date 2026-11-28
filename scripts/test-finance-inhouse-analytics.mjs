import test from 'node:test';
import assert from 'node:assert/strict';
import {contribution,liquidityScenario,concentration} from '../src/core/finance-inhouse-analytics.mjs';
test('contribution in minor units, after variable costs',()=>{
 const x=contribution({netRevenue:10000,acquisitionCost:6000,logisticsCost:1000,paymentFees:300,otherVariableCost:200});
 assert.equal(x.contribution,2500);assert.equal(x.margin,.25);
});
test('zero revenue is not a zero margin',()=>assert.equal(contribution({netRevenue:0,acquisitionCost:100,logisticsCost:0,paymentFees:0,otherVariableCost:0}).margin,null));
test('invalid inputs rejected',()=>assert.throws(()=>contribution({netRevenue:100.5,acquisitionCost:1,logisticsCost:0,paymentFees:0,otherVariableCost:0})));
test('cash forecast exposes shortfall',()=>{
 const x=liquidityScenario({openingCash:1000,periods:[{receipts:100,payments:400},{receipts:0,payments:900}]});
 assert.equal(x.closingCash,-200);assert.equal(x.minimumCash,-200);assert.equal(x.firstShortfallPeriod,2);assert.equal(x.executionEligible,false);
});
test('concentration metrics and no-exposure behavior',()=>{
 assert.deepEqual(concentration([50,50]),{total:100,largestShare:.5,hhi:.5});assert.equal(concentration([0,0]),null);
});
