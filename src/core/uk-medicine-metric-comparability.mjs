/**
 * Source-published UK medicines series discontinuity guard.
 * Does not provide an accepted cross-country metric or grant source rights.
 * A potentially comparable pair is a candidate for independent QA only.
 */
const sources = Object.freeze({
  'bso.gp-prescribing': Object.freeze({jurisdiction:'GB-NIR',period:'month',metrics:['items','quantity','gross_cost_gbp','actual_cost_gbp','bnf_chapter','bnf_code'],views:['gp-presentation']}),
  'bso.dispensing-contractor': Object.freeze({jurisdiction:'GB-NIR',period:'month',metrics:['items'],views:['contractor-flow']}),
  'phs.prescriptions-community': Object.freeze({jurisdiction:'GB-SCT',period:'month',metrics:['paid_quantity','gross_ingredient_cost_gbp','bnf_item_code'],views:['board','prescriber','dispenser']}),
  'phs.prescribed-dispensed': Object.freeze({jurisdiction:'GB-SCT',period:'quarter',metrics:['items'],views:['prescriber-to-dispenser-flow']}),
  'nhsbsa.epd': Object.freeze({jurisdiction:'GB-ENG',period:'month',metrics:['items','quantity','nic_gbp','actual_cost_gbp'],views:['prescribing']}),
  'nhsbsa.pca': Object.freeze({jurisdiction:'GB-ENG',period:'month',metrics:['items','total_quantity','nic_gbp'],views:['dispensing-reimbursement']}),
});
export const UK_SERIES_CANDIDATE_SOURCES=Object.freeze(Object.keys(sources));

const boundaries=Object.freeze({
  'bso.gp-prescribing':Object.freeze([
    {metric:'bnf_code',date:'2018-09',reason:'BNF code population changes after September 2018'},
    {metric:'quantity',date:'2021-08',reason:'BSO quantity representation for some inhalers, sprays and solutions changed from August 2021'},
    {metric:'bnf_chapter',date:'2021-10',reason:'BSO BNF chapter classifications changed for some medicines and appliances around October 2021'},
    {metric:'gross_cost_gbp',date:'2024-05',reason:'BSO late concessionary price adjustments included from May 2024'},
    {metric:'actual_cost_gbp',date:'2024-05',reason:'BSO late concessionary price adjustments included from May 2024'},
  ]),
  'phs.prescriptions-community':Object.freeze([
    {metric:'paid_quantity',date:'2023-05',reason:'PHS quantity mapping introduced from May 2023'},
  ]),
});
const monthPattern=/^(?:19|20)\d{2}-(?:0[1-9]|1[0-2])$/;
const quarterPattern=/^(?:19|20)\d{2}-Q[1-4]$/;
function deny(reason){throw new Error('UK medicines series comparison refused: '+reason);}
function safePoint(p){
  if(!p||typeof p!=='object'||Array.isArray(p))deny('invalid point');
  const def=sources[p.sourceId];
  if(!def)deny('unregistered source');
  if(!def.metrics.includes(p.metric))deny('unknown or incompatible metric');
  if(!def.views.includes(p.view))deny('unqualified data view');
  if(typeof p.reportingPeriod!=='string'||!(def.period==='month'?monthPattern:quarterPattern).test(p.reportingPeriod))deny('wrong reporting period precision');
  return def;
}
function crosses(a,b,threshold){
  const from=a<b?a:b, to=a<b?b:a;
  return from<threshold && to>=threshold;
}
export function assessUkMedicineSeriesPair(left,right){
  const a=safePoint(left),b=safePoint(right);
  const blockers=[];
  if(left.sourceId!==right.sourceId)blockers.push('different_publisher_source_or_measure_grain');
  if(a.jurisdiction!==b.jurisdiction)blockers.push('national_jurisdiction_mismatch');
  if(left.view!==right.view)blockers.push('overlapping_or_different_publication_views');
  if(left.metric!==right.metric)blockers.push('different_metric_definitions');
  if(left.reportingPeriod===right.reportingPeriod)blockers.push('duplicate_reporting_period_not_growth');
  if(left.sourceId===right.sourceId && left.view===right.view && left.metric===right.metric && left.reportingPeriod!==right.reportingPeriod){
    for(const boundary of boundaries[left.sourceId]??[]){
      if(boundary.metric===left.metric && crosses(left.reportingPeriod,right.reportingPeriod,boundary.date))blockers.push('publisher_method_break:'+boundary.date);
    }
  }
  return Object.freeze({contract:'novapharm.uk.source-comparability-v1',sourceId:left.sourceId,metric:left.metric,
    jurisdiction:a.jurisdiction,from:left.reportingPeriod,to:right.reportingPeriod,
    candidatePeriodComparison: blockers.length===0, blockers:Object.freeze(blockers),
    crossNationSumAllowed:false,sourceRightsApproved:false,validatedNationalSeries:false,productionApproved:false});
}
