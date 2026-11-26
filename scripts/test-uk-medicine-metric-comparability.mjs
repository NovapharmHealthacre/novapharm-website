import test from 'node:test';
import assert from 'node:assert/strict';
import { assessUkMedicineSeriesPair,UK_SERIES_CANDIDATE_SOURCES } from '../src/core/uk-medicine-metric-comparability.mjs';
const P=(sourceId,metric,reportingPeriod,view)=>({sourceId,metric,reportingPeriod,view});
const ni=(m,d)=>P('bso.gp-prescribing',m,d,'gp-presentation');
const pitc=(m,d,v='board')=>P('phs.prescriptions-community',m,d,v);
test('six registered source-grain pairs include England EPD/PCA but never equate them',()=>{
  assert.equal(UK_SERIES_CANDIDATE_SOURCES.length,6);
  assert.equal(assessUkMedicineSeriesPair(P('nhsbsa.epd','items','2026-06','prescribing'),P('nhsbsa.pca','items','2026-07','dispensing-reimbursement')).candidatePeriodComparison,false);
});
test('Northern Ireland publisher quantity boundary August 2021 rejects naive continuity',()=>{
  const x=assessUkMedicineSeriesPair(ni('quantity','2021-07'),ni('quantity','2021-08'));
  assert.deepEqual(x.blockers,['publisher_method_break:2021-08']);
  assert.equal(x.productionApproved,false);
  assert.equal(assessUkMedicineSeriesPair(ni('quantity','2026-08'),ni('quantity','2026-09')).candidatePeriodComparison,true);
});
test('Northern Ireland BNF code and chapter source correction dates reject naive trends',()=>{
  assert.ok(assessUkMedicineSeriesPair(ni('bnf_code','2018-08'),ni('bnf_code','2018-09')).blockers.includes('publisher_method_break:2018-09'));
  assert.ok(assessUkMedicineSeriesPair(ni('bnf_chapter','2021-09'),ni('bnf_chapter','2021-10')).blockers.includes('publisher_method_break:2021-10'));
});
test('Northern Ireland May 2024 late concessions affect both cost metrics, not item counts',()=>{
  for(const metric of ['gross_cost_gbp','actual_cost_gbp']) assert.ok(assessUkMedicineSeriesPair(ni(metric,'2024-04'),ni(metric,'2024-05')).blockers.includes('publisher_method_break:2024-05'));
  assert.equal(assessUkMedicineSeriesPair(ni('items','2024-04'),ni('items','2024-05')).candidatePeriodComparison,true);
});
test('Scottish May 2023 quantity mapping and separate overlapping views are never added',()=>{
  assert.ok(assessUkMedicineSeriesPair(pitc('paid_quantity','2023-04'),pitc('paid_quantity','2023-05')).blockers.includes('publisher_method_break:2023-05'));
  assert.ok(assessUkMedicineSeriesPair(pitc('paid_quantity','2026-08','board'),pitc('paid_quantity','2026-09','prescriber')).blockers.includes('overlapping_or_different_publication_views'));
  assert.equal(assessUkMedicineSeriesPair(pitc('gross_ingredient_cost_gbp','2026-08'),pitc('gross_ingredient_cost_gbp','2026-09')).crossNationSumAllowed,false);
});
test('quarterly Scottish location-flow periods are not months, even when numbers look alike',()=>{
  const scot=(d)=>P('phs.prescribed-dispensed','items',d,'prescriber-to-dispenser-flow');
  assert.equal(assessUkMedicineSeriesPair(scot('2026-Q1'),scot('2026-Q2')).candidatePeriodComparison,true);
  assert.throws(()=>assessUkMedicineSeriesPair(scot('2026-Q1'),scot('2026-04')), /comparison refused/);
});
test('cross-national same-named metrics remain incompatible',()=>{
  const x=assessUkMedicineSeriesPair(ni('items','2026-08'),P('nhsbsa.epd','items','2026-09','prescribing'));
  assert.ok(x.blockers.includes('national_jurisdiction_mismatch'));
  assert.ok(x.blockers.includes('different_publisher_source_or_measure_grain'));
  assert.equal(x.crossNationSumAllowed,false);
});
test('malformed months and unsupported metrics fail closed, duplicate dates cannot be a trend',()=>{
  assert.throws(()=>assessUkMedicineSeriesPair(ni('quantity','2026-13'),ni('quantity','2026-09')), /comparison refused/);
  assert.throws(()=>assessUkMedicineSeriesPair(ni('made_up','2026-08'),ni('made_up','2026-09')), /comparison refused/);
  const x=assessUkMedicineSeriesPair(ni('quantity','2026-09'),ni('quantity','2026-09'));
  assert.ok(x.blockers.includes('duplicate_reporting_period_not_growth'));
});
