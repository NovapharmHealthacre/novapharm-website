/**
 * NovaPharm's five-stage global distribution control plane (internal only).
 *
 * Technical purpose: assess whether the *evidence packet* is complete enough
 * for an independent operating review, calculate KPIs only from reconciled
 * orders, and block unsupported cross-border or AI-driven auto-order claims.
 *
 * This module NEVER verifies licences itself, activates a route, grants
 * stock/medicine rights, captures payment, places orders or dispatches goods.
 * All caller-supplied receipts remain untrusted until the named systems of
 * record and qualified reviewers authenticate them.
 */
const ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{2,127}$/u;
const DIGEST = /^[a-f0-9]{64}$/u;
const COUNTRY = /^[A-Z]{2}$/u;
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const validId = value => typeof value === 'string' && ID.test(value);
const validTime = value => typeof value === 'string' && ISO.test(value) &&
  Number.isFinite(Date.parse(value)) && new Date(value).toISOString() ===
  (value.includes('.') ? value : value.replace('Z', '.000Z'));
const plain = value => value && typeof value === 'object' &&
  !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
const safeInteger = value => Number.isSafeInteger(value) && value >= 0;

export const DISTRIBUTION_STAGES = Object.freeze({
  stage1_catalogue_enquiries: Object.freeze([
    'qualified_customer_identity_and_two_tenant_negative_tests',
    'canonical_catalogue_product_rights',
    'persistent_account_scoped_quote_and_support_ledger',
    'independent_signed_in_customer_acceptance',
    'secure_recovery_and_audit_replay'
  ]),
  stage2_uk_wholesale: Object.freeze([
    'independently_verified_activity_and_site_licences',
    'quality_and_responsible_person_signoff',
    'qualified_suppliers_buyers_and_product_country_rights',
    'warehouse_batch_expiry_fefo_and_allocatable_stock',
    'approved_contract_prices_tax_credit_and_invoicing',
    'qualified_3pl_carrier_returns_recall_and_pod',
    'all_applicable_d01_d15_order_release_gates'
  ]),
  stage3_uk_customer_density: Object.freeze([
    'qualified_repeat_customer_contracts',
    'reconciled_warehouse_and_carrier_service_metrics',
    'measured_on_time_in_full_and_exception_resolution',
    'reconciled_positive_contribution_per_drop',
    'cash_conversion_and_credit_control'
  ]),
  stage4_multicountry_federation: Object.freeze([
    'verified_legal_regulatory_route_per_country_and_sku',
    'qualified_local_licensed_distribution_partner',
    'country_specific_import_export_and_tax_authority',
    'independently_accepted_3pl_transport_and_quality_lanes',
    'country_data_governance_and_signed_service_levels'
  ]),
  stage5_scale_advantages: Object.freeze([
    'manufacturer_and_supplier_allocation_contracts',
    'rights_cleared_demand_and_shortage_intelligence',
    'independently_backtested_forecasts_and_bias_review',
    'working_capital_risk_and_financing_authority',
    'human_approved_replenishment_and_specialty_quality_system'
  ])
});

const freeze = value => Object.freeze(value);
function snapshot(status, blockers, other={}) {
  return freeze({
    status,
    evidenceReadyForReview: status === 'evidence_packet_complete_for_independent_review',
    operatingStageAccepted: false,
    saleAuthorised: false,
    shipmentAuthorised: false,
    paymentAuthorised: false,
    blockers: freeze([...new Set(blockers)]),
    ...other
  });
}

function receiptIsCandidate(receipt, stage, control, scope, asOfMs) {
  if (!plain(receipt) || receipt.stage !== stage || receipt.control !== control ||
      receipt.reviewStatus !== 'approved' ||
      receipt.recordOrigin !== 'controlled_business_quality_system' ||
      receipt.independentlyReviewed !== true ||
      !validId(receipt.evidenceId) || !validId(receipt.reviewerId) ||
      !validId(receipt.reviewerRole) || !DIGEST.test(receipt.sha256 || '') ||
      !validTime(receipt.verifiedAt) || !validTime(receipt.validUntil) ||
      Date.parse(receipt.verifiedAt) > asOfMs ||
      Date.parse(receipt.validUntil) <= asOfMs) return false;
  const d=receipt.scope;
  return plain(d) &&
    d.legalEntity === scope.legalEntity &&
    d.country === scope.country &&
    d.productId === scope.productId &&
    d.siteId === scope.siteId &&
    d.partnerId === scope.partnerId;
}

/** Checks the five staged evidence packs. This is not independent authentication. */
export function reviewGlobalDistributionStages(packet={}, {asOf}={}) {
  const blockers=[];
  const scope=packet?.scope;
  const now=validTime(asOf)?Date.parse(asOf):NaN;
  if (!Number.isFinite(now)) blockers.push('missing_valid_server_review_time');
  if (!plain(scope) || ![scope?.legalEntity,scope?.productId,scope?.siteId,scope?.partnerId].every(validId) ||
      typeof scope?.country !== 'string' || !COUNTRY.test(scope.country)) blockers.push('invalid_legal_product_site_partner_country_scope');
  const receipts=packet?.receipts;
  if (!Array.isArray(receipts)) blockers.push('missing_evidence_receipts');
  const stages={};
  for (const [stage,controls] of Object.entries(DISTRIBUTION_STAGES)) {
    const missing=[];
    for (const control of controls) {
      const found=Array.isArray(receipts)?receipts.filter(r=>plain(r)&&r.stage===stage&&r.control===control):[];
      if (found.length!==1 || !Number.isFinite(now) || !plain(scope) ||
          !receiptIsCandidate(found[0],stage,control,scope,now)) missing.push(control);
    }
    stages[stage]=freeze({
      requiredControls:controls.length,
      candidateReceipts:controls.length-missing.length,
      missingOrInvalidControls:freeze(missing),
      status:missing.length===0?'evidence_packet_complete_for_independent_review':'blocked',
      businessOperational:false
    });
  }
  if (Array.isArray(receipts)) {
    const expected=new Set(Object.entries(DISTRIBUTION_STAGES)
      .flatMap(([stage,controls])=>controls.map(control=>stage+':'+control)));
    if (receipts.length!==expected.size || receipts.some(r=>!plain(r) ||
        !expected.has(r.stage+':'+r.control))) blockers.push('unknown_duplicate_or_unscoped_receipts');
  }
  const ready=blockers.length===0 && Object.values(stages).every(s=>s.status==='evidence_packet_complete_for_independent_review');
  return snapshot(ready?'evidence_packet_complete_for_independent_review':'blocked',blockers,{
    stages:freeze(stages),
    requiresAuthenticatedEvidenceAndIndependentHumanSignoff:true,
    requiresRegulatoryFinancialAndWarehouseRelease:true,
    // Even a synthetically complete pack cannot authorize a single order.
    globalDistributorOperational:false
  });
}

const TERRITORY_GATES=freeze([
  'local_legal_activity_route',
  'supplier_and_buyer_authorisation',
  'product_country_market_rights',
  'qualified_warehouse_site_and_lane',
  'import_export_and_local_tax',
  'quality_temperature_recall_and_returns',
  'approved_contract_currency_and_credit',
  'country_data_transfer_and_customer_permissions'
]);
export const TERRITORY_RELEASE_CONTROLS=TERRITORY_GATES;

/**
 * A UK licence/contract can never be accepted as authority for another
 * country, site, product, buyer or distribution partner.
 */
export function reviewFederatedTerritoryCandidate(packet={}, {asOf}={}) {
  const scope=packet?.scope;
  const now=validTime(asOf)?Date.parse(asOf):NaN;
  const blocks=[];
  if (!Number.isFinite(now)) blocks.push('invalid_review_time');
  if (!plain(scope) || ![scope?.legalEntity,scope?.productId,scope?.siteId,scope?.partnerId].every(validId) ||
      !COUNTRY.test(scope?.country || '')) blocks.push('unverified_territory_scope');
  const evidence=Array.isArray(packet?.evidence)?packet.evidence:[];
  for(const gate of TERRITORY_GATES){
    const row=evidence.filter(r=>plain(r)&&r.gate===gate);
    if (row.length!==1 || !plain(row[0]) ||
        row[0].decision!=='approved_for_independent_quality_review' ||
        row[0].independentlyReviewed!==true ||
        row[0].recordOrigin!=='qualified_local_partner_register' ||
        !validId(row[0].evidenceId) || !validId(row[0].reviewerId) ||
        !DIGEST.test(row[0].sha256 || '') ||
        !validTime(row[0].validUntil) || !Number.isFinite(now) ||
        Date.parse(row[0].validUntil)<=now ||
        !plain(scope) || !plain(row[0].scope) ||
        Object.keys(scope).some(k=>row[0].scope[k]!==scope[k])) {
      blocks.push('missing_expired_or_wrong_territory_evidence:'+gate);
    }
  }
  if(evidence.length!==TERRITORY_GATES.length ||
     evidence.some(r=>!plain(r)||!TERRITORY_GATES.includes(r.gate)))
    blocks.push('unexpected_or_duplicate_territory_evidence');
  const ready=blocks.length===0;
  return snapshot(ready?'evidence_packet_complete_for_independent_review':'blocked',blocks,{
    territory:plain(scope)?scope.country:null,
    productId:plain(scope)?scope.productId:null,
    partnerId:plain(scope)?scope.partnerId:null,
    partnerLive:false,
    canImportOrDistribute:false,
    countryPermissionInheritedFromUK:false
  });
}

/**
 * Calculate outcome KPIs only for a complete, reviewed order-level source.
 * Missing sources/unknown proof remain null, not synthetic 0% or 100%.
 */
export function measureVerifiedDistributionService({
  orders,sourceReview,periodStart,periodEnd,country
}={}) {
  const blocked=(reason,found=0)=>freeze({
    status:'not_measured',reason,ordersReviewed:found,
    ordersDue:null,otifPercent:null,perfectOrderPercent:null,
    grossContributionMinor:null,contributionOrders:null,
    noSourceDataAssumed:true
  });
  if (!plain(sourceReview) || sourceReview.independentlyReviewed!==true ||
      sourceReview.coverageComplete!==true || sourceReview.synthetic!==false ||
      sourceReview.authority!=='reconciled_order_warehouse_carrier_finance_ledger' ||
      !validId(sourceReview.datasetId) || !DIGEST.test(sourceReview.sha256 || ''))
    return blocked('unverified_or_incomplete_operational_source');
  if (!validTime(periodStart)||!validTime(periodEnd)||Date.parse(periodEnd)<=Date.parse(periodStart)||
      !COUNTRY.test(country || '') || !Array.isArray(orders))
    return blocked('invalid_period_or_country');
  const seen=new Set(); const eligible=[];
  for(const row of orders){
    if (!plain(row) || !validId(row.orderId) || row.country!==country ||
        seen.has(row.orderId) || !validTime(row.dueAt) ||
        !['accepted','dispatched','delivered','cancelled'].includes(row.status)) {
      return blocked('invalid_duplicate_or_cross_country_order',orders.length);
    }
    seen.add(row.orderId);
    const due=Date.parse(row.dueAt);
    if(due>=Date.parse(periodStart) && due<Date.parse(periodEnd)){
      if(typeof row.allLinesComplete!=='boolean'||typeof row.qualityConditionVerified!=='boolean'||
         typeof row.invoiceCorrectVerified!=='boolean'||typeof row.documentationVerified!=='boolean'||
         typeof row.carrierEvidenceComplete!=='boolean' ||
         (row.status==='delivered' && (!validTime(row.deliveredAt)||row.deliveryProofVerified!==true)))
        return blocked('missing_warehouse_carrier_or_finance_truth',orders.length);
      eligible.push(row);
    }
  }
  const due=eligible.length;
  const onTime=eligible.filter(r=>r.status==='delivered' &&
    r.deliveryProofVerified===true && r.allLinesComplete &&
    Date.parse(r.deliveredAt)<=Date.parse(r.dueAt)).length;
  const perfect=eligible.filter(r=>r.status==='delivered' && r.deliveryProofVerified===true &&
    r.allLinesComplete && r.qualityConditionVerified &&
    r.invoiceCorrectVerified && r.documentationVerified &&
    r.carrierEvidenceComplete && Date.parse(r.deliveredAt)<=Date.parse(r.dueAt)).length;
  let contribution=0;let contributionsComplete=true;
  for(const row of eligible) {
    if (row.financeReconciled!==true ||
        !['netSalesMinor','landedCostMinor','fulfilmentCostMinor','paymentFeesMinor','returnCostMinor']
          .every(k=>safeInteger(row[k]))) {
      contributionsComplete=false;break;
    }
    contribution+=row.netSalesMinor-row.landedCostMinor-row.fulfilmentCostMinor-
      row.paymentFeesMinor-row.returnCostMinor;
    if(!Number.isSafeInteger(contribution)){contributionsComplete=false;break;}
  }
  return freeze({
    status:due>0?'measured_from_reviewed_order_records':'no_due_orders_in_covered_period',
    ordersReviewed:orders.length,
    ordersDue:due,
    otifPercent:due?Math.round(10000*onTime/due)/100:null,
    perfectOrderPercent:due?Math.round(10000*perfect/due)/100:null,
    grossContributionMinor:due&&contributionsComplete?contribution:null,
    contributionOrders:contributionsComplete?due:null,
    currency:sourceReview.currency || null,
    sourceDatasetId:sourceReview.datasetId,
    noSourceDataAssumed:true,
    // Results are performance indicators, NOT trading authorisation.
    paymentAuthorised:false,
    shipmentAuthorised:false
  });
}

/** Stage 5 analysis signals are suggestions, not automatic replenishment. */
export function reviewReplenishmentSuggestion({
  country,productId,signal,sourceReview,reviewer
}={}) {
  const blocks=[];
  if(!COUNTRY.test(country || '')||!validId(productId))blocks.push('missing_territory_product_scope');
  if(!plain(sourceReview)||sourceReview.rightsCleared!==true ||
    sourceReview.approvedPurpose!=='internal_supply_planning'||
    sourceReview.synthetic!==false||!validId(sourceReview.evidenceId))
    blocks.push('source_rights_or_purpose_unverified');
  if(!plain(signal)||signal.country!==country||signal.productId!==productId||
    !safeInteger(signal.suggestedQuantity)||
    !validId(signal.modelVersion)||!validId(signal.evidenceId)||
    signal.humanReviewed!==false)blocks.push('invalid_or_preapproved_signal');
  if(!plain(reviewer)||reviewer?.role!=='authorised_supply_planner'||
    reviewer?.mfaVerified!==true||!validId(reviewer?.actorId))
    blocks.push('verified_human_review_required');
  return freeze({
    status:blocks.length?'blocked':'candidate_for_human_review',
    blockers:freeze(blocks),
    suggestedQuantity:blocks.length?null:signal.suggestedQuantity,
    saleAuthorised:false,
    orderPlaced:false,
    stockReserved:false,
    supplierContacted:false,
    medicineSubstitutionAuthorised:false
  });
}
