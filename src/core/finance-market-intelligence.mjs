// Public-source fiscal observations and UI-facing country layer contract.
const base='https://api.fiscaldata.treasury.gov/services/api/fiscal_service/v2/accounting/od/';
const docs='https://fiscaldata.treasury.gov/api-documentation/';
const dateValid=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
const decimal=s=>typeof s==='string'&&/^-?\d+(\.\d+)?$/.test(s);
async function request(endpoint,query,fetcher){
 const url=new URL(endpoint,base);url.search=new URLSearchParams(query).toString();
 const res=await fetcher(url,{signal:AbortSignal.timeout(20000),redirect:'error',headers:{Accept:'application/json'}});
 if(!res.ok)throw new Error('Treasury HTTP '+res.status);
 const raw=await res.text();if(raw.length>2_000_000)throw new Error('Oversized response');
 const body=JSON.parse(raw);if(!Array.isArray(body.data)||!body.data.length)throw new Error('No Treasury observations');
 return body.data;
}
const debtFields=['debt_held_public_amt','intragov_hold_amt','tot_pub_debt_out_amt'];
export function normalizeDebt(row,retrievedAt){
 if(!dateValid(row?.record_date)||row.record_date>retrievedAt.slice(0,10)||!debtFields.every(f=>decimal(row[f])&&/^\d+\.\d{2}$/.test(row[f])))throw new Error('Invalid debt record');
 const pennies=s=>BigInt(s.replace('.',''));
 if(pennies(row[debtFields[0]])+pennies(row[debtFields[1]])!==pennies(row[debtFields[2]]))throw new Error('Debt components do not reconcile');
 return debtFields.map(metric=>({country:'USA',metric,decimalValue:row[metric],unit:'USD',period:row.record_date,retrievedAt,source:'usTreasury',sourceCadence:'business_day',sourceUrl:docs,publicationStatus:'review_required'}));
}
export function normalizeRates(rows,retrievedAt){
 if(!rows.length)throw new Error('No interest rate records');
 const latest=rows[0].record_date;
 if(!dateValid(latest)||latest>retrievedAt.slice(0,10))throw new Error('Invalid interest record date');
 const seen=new Set(),out=[];
 for(const r of rows){
  if(r.record_date!==latest)continue;
  if(typeof r.security_type_desc!=='string'||typeof r.security_desc!=='string')throw new Error('Missing security classification');
  if(r.avg_interest_rate_amt===null||r.avg_interest_rate_amt==='null')continue;
  if(!decimal(r.avg_interest_rate_amt)||!Number.isFinite(Number(r.avg_interest_rate_amt)))throw new Error('Invalid rate');
  const series=r.security_type_desc+' / '+r.security_desc;
  if(seen.has(series))throw new Error('Duplicate rate series');seen.add(series);
  out.push({country:'USA',metric:'average_outstanding_debt_interest_rate',series,value:Number(r.avg_interest_rate_amt),unit:'percent',period:latest,retrievedAt,source:'usTreasury',sourceCadence:'monthly',sourceUrl:docs,executionEligible:false,publicationStatus:'review_required'});
 }
 if(!out.length)throw new Error('No usable interest records');
 return out;
}
export async function ingestTreasury({fetcher=fetch,now=new Date()}={}){
 const retrievedAt=now.toISOString(),observations=[],status=[];
 for(const [endpoint,fields,normalizer] of [
 ['debt_to_penny',['record_date',...debtFields],rows=>normalizeDebt(rows[0],retrievedAt)],
 ['avg_interest_rates',['record_date','security_type_desc','security_desc','avg_interest_rate_amt'],rows=>normalizeRates(rows,retrievedAt)]
 ]){
  try{
   const rows=await request(endpoint,{fields:fields.join(','),sort:'-record_date','page[size]':endpoint==='debt_to_penny'?'1':'100'},fetcher);
   if(endpoint==='avg_interest_rates'&&rows.length===100&&rows.at(-1).record_date===rows[0].record_date)throw new Error('Latest period may be truncated');
   const records=normalizer(rows);observations.push(...records);status.push({source:'usTreasury',series:endpoint,state:'retrieved',count:records.length});
  }catch(e){status.push({source:'usTreasury',series:endpoint,state:'failed',error:String(e.message)});}
 }
 return {schemaVersion:1,retrievedAt,observations,status,publicationApproved:false,productionVerified:false,paidServices:false};
}
export const countryLayers=Object.freeze({
 gdp_growth:{unit:'percent',label:'Real GDP growth',maxAgeYears:2},
 inflation:{unit:'percent',label:'Consumer price inflation',maxAgeYears:2},
 fdi_net_inflows:{unit:'current_usd',label:'Annual net FDI inflows',maxAgeYears:3},
 population:{unit:'persons',label:'Population',maxAgeYears:2}
});
// Comparable annual observations only. Never rank across reporting years or treat FDI as live portfolio flows.
export function buildCountryLayer({observations,countryCodes,metric,year,asOf}){
 if(!Object.hasOwn(countryLayers,metric)||!/^\d{4}$/.test(String(year))||!dateValid(asOf)||Number(year)>Number(asOf.slice(0,4)))throw new Error('Invalid country layer request');
 const spec=countryLayers[metric],countries=[...new Set(countryCodes)].sort(),allowed=new Set(countries),map=new Map();
 if(countries.some(c=>!/^[A-Z]{3}$/.test(c)))throw new Error('Expected ISO3 codes from governed country registry');
 for(const r of observations){
  if(!allowed.has(r.country)||r.metric!==metric||r.source!=='worldBank'||r.unit!==spec.unit||r.period!==String(year)||typeof r.value!=='number'||!Number.isFinite(r.value))continue;
  if(map.has(r.country)&&map.get(r.country).value!==r.value)throw new Error('Conflicting country observation');
  map.set(r.country,r);
 }
 const stale=Number(asOf.slice(0,4))-Number(year)>spec.maxAgeYears;
 const rows=countries.map(country=>{const r=map.get(country);return {country,value:r?.value??null,period:String(year),source:r?.source??null,retrievedAt:r?.retrievedAt??null,state:!r?'missing':stale?'stale':'available'}});
 const ranking=stale?[]:rows.filter(r=>r.state==='available').sort((a,b)=>b.value-a.value||a.country.localeCompare(b.country));
 return {metric,label:spec.label,unit:spec.unit,period:String(year),rows,ranking,coverage:{available:rows.filter(r=>r.state==='available').length,stale:rows.filter(r=>r.state==='stale').length,total:countries.length},mode:'annual_reference_not_live',publicationApproved:false};
}
