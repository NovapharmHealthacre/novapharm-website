import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DISTRIBUTION_STAGES,
  TERRITORY_RELEASE_CONTROLS,
  reviewGlobalDistributionStages,
  reviewFederatedTerritoryCandidate,
  measureVerifiedDistributionService,
  reviewReplenishmentSuggestion
} from '../src/core/distribution-network-controls.mjs';

const scope = Object.freeze({
  legalEntity:'NOVAPHARM-UK',country:'GB',
  productId:'NUTRAXIN-D3-001',siteId:'UK-WAREHOUSE-001',
  partnerId:'DISTRIBUTOR-UK-001'
});
const asOf='2026-11-14T12:00:00Z';
const digest='a'.repeat(64);
const receipt=(stage,control,overrides={})=>({
  stage,control,reviewStatus:'approved',recordOrigin:'controlled_business_quality_system',
  independentlyReviewed:true,evidenceId:'EVIDENCE-'+stage+'-'+control,
  reviewerId:'REVIEWER-LEGAL-001',reviewerRole:'Regulatory-Quality',
  sha256:digest,verifiedAt:'2026-11-13T12:00:00Z',
  validUntil:'2027-11-13T12:00:00Z',scope:{...scope},...overrides
});
const fullEvidence=()=>({
  scope:{...scope},
  receipts:Object.entries(DISTRIBUTION_STAGES)
    .flatMap(([stage,controls])=>controls.map(control=>receipt(stage,control)))
});

test('all five stages exist and explicitly cover customer, UK, density, federation and scale',()=>{
  assert.equal(Object.keys(DISTRIBUTION_STAGES).length,5);
  for(const [stage,controls] of Object.entries(DISTRIBUTION_STAGES)){
    assert.ok(stage.startsWith('stage'));
    assert.ok(controls.length>=5);
    assert.equal(new Set(controls).size,controls.length);
  }
});

test('missing stage evidence blocks every stage; code cannot create a live distributor',()=>{
  const r=reviewGlobalDistributionStages({},{asOf});
  assert.equal(r.status,'blocked');
  assert.equal(r.globalDistributorOperational,false);
  assert.equal(r.saleAuthorised,false);
  assert.equal(r.shipmentAuthorised,false);
  assert.equal(r.paymentAuthorised,false);
  for(const item of Object.values(r.stages)){
    assert.equal(item.businessOperational,false);
    assert.equal(item.candidateReceipts,0);
    assert.equal(item.missingOrInvalidControls.length,item.requiredControls);
  }
});

test('even a synthetically complete five-stage packet only permits independent review',()=>{
  const r=reviewGlobalDistributionStages(fullEvidence(),{asOf});
  assert.equal(r.evidenceReadyForReview,true);
  assert.equal(r.status,'evidence_packet_complete_for_independent_review');
  assert.equal(r.globalDistributorOperational,false);
  assert.equal(r.saleAuthorised,false);
  assert.equal(r.shipmentAuthorised,false);
  assert.equal(r.paymentAuthorised,false);
  assert.equal(r.requiresAuthenticatedEvidenceAndIndependentHumanSignoff,true);
  for(const stage of Object.values(r.stages))assert.equal(stage.businessOperational,false);
});

for(const [stage,controls] of Object.entries(DISTRIBUTION_STAGES)){
  test(stage+' invalid missing, expired, duplicate or cross-country evidence remains blocked',()=>{
    const gate=controls[0];
    for(const mutate of [
      p=>p.receipts=p.receipts.filter(r=>!(r.stage===stage&&r.control===gate)),
      p=>p.receipts.find(r=>r.stage===stage&&r.control===gate).scope.country='US',
      p=>p.receipts.find(r=>r.stage===stage&&r.control===gate).validUntil='2026-01-01T00:00:00Z',
      p=>p.receipts.find(r=>r.stage===stage&&r.control===gate).independentlyReviewed=false,
      p=>p.receipts.push({...p.receipts.find(r=>r.stage===stage&&r.control===gate)}),
      p=>p.receipts.find(r=>r.stage===stage&&r.control===gate).sha256='not-a-digest'
    ]){
      const packet=fullEvidence();mutate(packet);
      const got=reviewGlobalDistributionStages(packet,{asOf});
      assert.equal(got.globalDistributorOperational,false);
      assert.equal(got.evidenceReadyForReview,false);
      assert.equal(got.stages[stage].status,'blocked');
    }
  });
}

test('no review can pass without a valid server observation time',()=>{
  for(const t of [undefined,'not-time','2026-11-14', '2026-11-14T12:00:00+00:00']){
    const r=reviewGlobalDistributionStages(fullEvidence(),{asOf:t});
    assert.equal(r.status,'blocked');
    assert.equal(r.saleAuthorised,false);
  }
});

const territoryReceipt=(gate,withScope=scope)=>({
  gate,decision:'approved_for_independent_quality_review',
  independentlyReviewed:true,recordOrigin:'qualified_local_partner_register',
  evidenceId:'PARTNER-EVIDENCE-'+gate,reviewerId:'QUALITY-REVIEWER-001',
  sha256:digest,validUntil:'2027-11-13T12:00:00Z',scope:{...withScope}
});
const partnerPacket=(withScope=scope)=>({
  scope:{...withScope},evidence:TERRITORY_RELEASE_CONTROLS.map(gate=>territoryReceipt(gate,withScope))
});

test('territory requires eight independent partner and lawful route controls',()=>{
  assert.equal(TERRITORY_RELEASE_CONTROLS.length,8);
  const result=reviewFederatedTerritoryCandidate(partnerPacket(),{asOf});
  assert.equal(result.status,'evidence_packet_complete_for_independent_review');
  assert.equal(result.partnerLive,false);
  assert.equal(result.canImportOrDistribute,false);
  assert.equal(result.saleAuthorised,false);
  assert.equal(result.countryPermissionInheritedFromUK,false);
});

test('UK rights do not pass for US, DE, UAE, other product or different distributor',()=>{
  for(const overrides of [
    {country:'US'}, {country:'DE'}, {country:'AE'},
    {productId:'OTHER-PRODUCT'}, {partnerId:'OTHER-PARTNER'},
    {siteId:'OTHER-SITE'}, {legalEntity:'OTHER-ENTITY'}
  ]){
    const packet=partnerPacket();
    packet.scope={...scope,...overrides};
    const result=reviewFederatedTerritoryCandidate(packet,{asOf});
    assert.equal(result.status,'blocked');
    assert.equal(result.canImportOrDistribute,false);
  }
});

test('territory false/expired/duplicate evidence cannot be considered reviewed',()=>{
  for(const mutate of [
    p=>p.evidence[0].validUntil='2026-01-01T00:00:00Z',
    p=>p.evidence[0].decision='approved_for_trade',
    p=>p.evidence[0].sha256='bad',
    p=>p.evidence[0].independentlyReviewed=false,
    p=>p.evidence.pop(),
    p=>p.evidence.push({...p.evidence[0]})
  ]){
    const p=partnerPacket();mutate(p);
    const result=reviewFederatedTerritoryCandidate(p,{asOf});
    assert.equal(result.status,'blocked');
    assert.equal(result.paymentAuthorised,false);
  }
});

const sourceReview={
  independentlyReviewed:true,coverageComplete:true,synthetic:false,
  authority:'reconciled_order_warehouse_carrier_finance_ledger',
  datasetId:'QUALIFIED-ORDER-LEDGER-001',sha256:digest,currency:'GBP'
};
const period={
  periodStart:'2026-11-01T00:00:00Z',
  periodEnd:'2026-12-01T00:00:00Z',country:'GB'
};
const order1={
  orderId:'VERIFIED-ORDER-001',country:'GB',status:'delivered',
  dueAt:'2026-11-14T17:00:00Z',deliveredAt:'2026-11-14T12:00:00Z',
  deliveryProofVerified:true,allLinesComplete:true,
  qualityConditionVerified:true,invoiceCorrectVerified:true,
  documentationVerified:true,carrierEvidenceComplete:true,
  financeReconciled:true,netSalesMinor:10000,landedCostMinor:6500,
  fulfilmentCostMinor:500,paymentFeesMinor:100,returnCostMinor:0
};
const order2={
  ...order1,orderId:'VERIFIED-ORDER-002',
  deliveredAt:'2026-11-15T12:00:00Z',
  netSalesMinor:8000,landedCostMinor:5500,fulfilmentCostMinor:400,
  paymentFeesMinor:100,returnCostMinor:100
};

test('unaccepted or synthetic operational data never produces a fictitious OTIF',()=>{
  for(const sr of [undefined,{}, {...sourceReview,synthetic:true},
    {...sourceReview,coverageComplete:false},
    {...sourceReview,authority:'owner_spreadsheet_only'},
    {...sourceReview,independentlyReviewed:false}]){
    const r=measureVerifiedDistributionService({orders:[order1],sourceReview:sr,...period});
    assert.equal(r.status,'not_measured');
    assert.equal(r.otifPercent,null);
    assert.equal(r.perfectOrderPercent,null);
    assert.equal(r.grossContributionMinor,null);
  }
});

test('reviewed due-order KPIs use correct denominators and GBP minor units',()=>{
  const m=measureVerifiedDistributionService({orders:[order1,order2],sourceReview,...period});
  assert.equal(m.status,'measured_from_reviewed_order_records');
  assert.equal(m.ordersReviewed,2);
  assert.equal(m.ordersDue,2);
  assert.equal(m.otifPercent,50);
  assert.equal(m.perfectOrderPercent,50);
  assert.equal(m.grossContributionMinor,4800);
  assert.equal(m.contributionOrders,2);
  assert.equal(m.currency,'GBP');
  assert.equal(m.saleAuthorised,undefined);
  assert.equal(m.shipmentAuthorised,false);
});

test('an observed zero due-orders is not a claimed zero OTIF',()=>{
  const r=measureVerifiedDistributionService({orders:[],sourceReview,...period});
  assert.equal(r.status,'no_due_orders_in_covered_period');
  assert.equal(r.ordersDue,0);
  assert.equal(r.otifPercent,null);
  assert.equal(r.perfectOrderPercent,null);
  assert.equal(r.grossContributionMinor,null);
});

test('missing finance costs produce unknown contribution, not synthetic zero',()=>{
  const a={...order1,financeReconciled:false};
  const m=measureVerifiedDistributionService({orders:[a],sourceReview,...period});
  assert.equal(m.otifPercent,100);
  assert.equal(m.grossContributionMinor,null);
  assert.equal(m.contributionOrders,null);
});

test('duplicate IDs, foreign country or missing shipment evidence invalidate KPI sample',()=>{
  for(const records of [
    [order1,order1], [{...order1,country:'US'}],
    [{...order1,deliveryProofVerified:false}],
    [{...order1,dueAt:'invalid'}]
  ]){
    const m=measureVerifiedDistributionService({orders:records,sourceReview,...period});
    assert.equal(m.status,'not_measured');
    assert.equal(m.otifPercent,null);
  }
});

const signal={
  country:'GB',productId:'NUTRAXIN-D3-001',suggestedQuantity:150,
  modelVersion:'FORECAST-MODEL-2026',evidenceId:'FORECAST-EVIDENCE-001',
  humanReviewed:false
};
const legalSignal={
  rightsCleared:true,approvedPurpose:'internal_supply_planning',
  synthetic:false,evidenceId:'SOURCE-RIGHTS-001'
};
const reviewer={
  role:'authorised_supply_planner',mfaVerified:true,actorId:'EMPLOYEE-001'
};
test('rights-cleared demand signal remains only a human-review candidate',()=>{
  const r=reviewReplenishmentSuggestion({
    country:'GB',productId:'NUTRAXIN-D3-001',
    signal,sourceReview:legalSignal,reviewer
  });
  assert.equal(r.status,'candidate_for_human_review');
  assert.equal(r.suggestedQuantity,150);
  assert.equal(r.orderPlaced,false);
  assert.equal(r.stockReserved,false);
  assert.equal(r.supplierContacted,false);
  assert.equal(r.medicineSubstitutionAuthorised,false);
});

test('unlicensed signals, wrong territory, user impersonation and synthetic input block',()=>{
  const cases=[
    {signal:{...signal,country:'US'}},
    {signal:{...signal,productId:'OTHER-PRODUCT'}},
    {sourceReview:{...legalSignal,rightsCleared:false}},
    {sourceReview:{...legalSignal,synthetic:true}},
    {reviewer:{...reviewer,mfaVerified:false}},
    {reviewer:{...reviewer,role:'customer'}},
    {signal:{...signal,humanReviewed:true}},
    {signal:{...signal,suggestedQuantity:-5}}
  ];
  for(const change of cases){
    const packet={country:'GB',productId:'NUTRAXIN-D3-001',signal,
      sourceReview:legalSignal,reviewer,...change};
    const r=reviewReplenishmentSuggestion(packet);
    assert.equal(r.status,'blocked');
    assert.equal(r.suggestedQuantity,null);
    assert.equal(r.orderPlaced,false);
  }
});
