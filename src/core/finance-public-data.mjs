// NovaPharm Finance: read-only public-source ingestion, no third-party paid SDK.
export const indicators = Object.freeze({
  'NY.GDP.MKTP.KD.ZG': ['gdp_growth','percent'],
  'FP.CPI.TOTL.ZG': ['inflation','percent'],
  'BX.KLT.DINV.CD.WD': ['fdi_net_inflows','current_usd'],
  'SP.POP.TOTL': ['population','persons']
});
export const sources = Object.freeze({
  worldBank: { publisher:'World Bank, World Development Indicators', terms:'https://www.worldbank.org/ext/en/legal/terms-conditions/datasets', cadence:'annual', rights:'dataset-specific review required before publication' },
  ecb: { publisher:'European Central Bank', terms:'https://www.ecb.europa.eu/services/using-our-site/disclaimer/html/index.en.html', cadence:'working-day reference rates', rights:'information only; not execution or settlement prices' }
});
const WB='https://api.worldbank.org/v2/';
const ECB='https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml';
async function request(url,fetcher,kind) {
  const res=await fetcher(url,{signal:AbortSignal.timeout(20000),redirect:'error',headers:{Accept:kind==='json'?'application/json':'application/xml'}});
  if(!res.ok) throw new Error('Publisher HTTP '+res.status);
  const body=await res.text();
  if(body.length>12_000_000) throw new Error('Publisher response exceeds limit');
  return kind==='json'?JSON.parse(body):body;
}
async function pages(path,fetcher,params={}) {
  let out=[],page=1,total=1;
  do {
    const url=new URL(path,WB);
    url.search=new URLSearchParams({format:'json',per_page:'1000',...params,page:String(page)}).toString();
    const data=await request(url,fetcher,'json');
    if(!Array.isArray(data)||!Array.isArray(data[1])||!Number.isInteger(Number(data[0]?.pages))||Number(data[0].page)!==page) throw new Error('Invalid World Bank page');
    total=Number(data[0].pages);
    if(total<1||total>20) throw new Error('Unexpected World Bank page count');
    out.push(...data[1]); page++;
  }while(page<=total);
  return out;
}
export function normalizeWorldBank(rows,code,countries,retrievedAt) {
  if(!Object.hasOwn(indicators,code)) throw new Error('Unknown indicator');
  const [metric,unit]=indicators[code],latest=new Map();
  for(const row of rows){
    const country=row.countryiso3code,period=String(row.date);
    if(!countries.has(country)||row.indicator?.id!==code||!/^\d{4}$/.test(period)||Number(period)>Number(retrievedAt.slice(0,4))||typeof row.value!=='number'||!Number.isFinite(row.value)) continue;
    const prev=latest.get(country);
    if(!prev||period>prev.period) latest.set(country,{country,metric,unit,period,value:row.value,source:'worldBank',series:code,retrievedAt,sourceCadence:'annual',publicationStatus:'review_required'});
    else if(period===prev.period&&prev.value!==row.value) throw new Error('Conflicting observation: '+country+' '+code+' '+period);
  }
  return [...latest.values()].sort((a,b)=>a.country.localeCompare(b.country));
}
export function parseEcbReferenceRates(xml,retrievedAt) {
  const dates=[...xml.matchAll(/<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]\s*>/g)];
  if(dates.length!==1) throw new Error('Expected exactly one ECB reference date');
  const period=dates[0][1];
  if(!Number.isFinite(Date.parse(period))||new Date(period).toISOString().slice(0,10)!==period||period>retrievedAt.slice(0,10)) throw new Error('Invalid ECB reference date');
  const rates=new Map();
  for(const m of xml.matchAll(/<Cube\s+currency=['"]([A-Z]{3})['"]\s+rate=['"]([0-9]+(?:\.[0-9]+)?)['"]\s*\/>/g)){
    const currency=m[1],value=Number(m[2]);
    if(!Number.isFinite(value)||value<=0||rates.has(currency)||currency==='EUR') throw new Error('Invalid or duplicate ECB rate');
    rates.set(currency,value);
  }
  if(!rates.has('GBP')||!rates.has('USD')||rates.size<10) throw new Error('Incomplete ECB reference-rate response');
  rates.set('EUR',1);
  return [...rates].sort(([a],[b])=>a.localeCompare(b)).map(([currency,value])=>({base:'EUR',quote:currency,metric:'fx_reference',unit:currency+'_per_EUR',period,value,source:'ecb',retrievedAt,sourceCadence:'working_day',executionEligible:false,publicationStatus:'review_required'}));
}
export function crossRate(rates,base,quote) {
  const a=rates.find(r=>r.base==='EUR'&&r.quote===base),b=rates.find(r=>r.base==='EUR'&&r.quote===quote);
  if(!a||!b||a.period!==b.period||!Number.isFinite(a.value)||!Number.isFinite(b.value)||a.value<=0||b.value<=0) return null;
  return {base,quote,value:b.value/a.value,period:a.period,source:'ecb',derived:true,executionEligible:false};
}
export async function ingest({fetcher=fetch,now=new Date()}={}) {
  const retrievedAt=now.toISOString(), observations=[], status=[];
  let countries;
  try{
    const rows=await pages('country',fetcher);
    countries=new Set(rows.filter(r=>r.region?.id&&r.region.id!=='NA'&&r.region.value!=='Aggregates'&&/^[A-Z]{3}$/.test(r.id)).map(r=>r.id));
    if(countries.size<100) throw new Error('Incomplete country metadata');
  }catch(e){status.push({source:'worldBank',series:'country_metadata',state:'failed',error:String(e.message)});}
  if(countries) for(const code of Object.keys(indicators)){
    try{
      const rows=await pages('country/all/indicator/'+code,fetcher,{mrv:'5'});
      const data=normalizeWorldBank(rows,code,countries,retrievedAt);
      if(!data.length) throw new Error('No usable observations');
      observations.push(...data);status.push({source:'worldBank',series:code,state:'retrieved',count:data.length});
    }catch(e){status.push({source:'worldBank',series:code,state:'failed',error:String(e.message)});}
  }
  try {
    const rates=parseEcbReferenceRates(await request(ECB,fetcher,'xml'),retrievedAt);
    observations.push(...rates);
    status.push({source:'ecb',series:'daily_reference',state:'retrieved',count:rates.length});
  }catch(e){status.push({source:'ecb',series:'daily_reference',state:'failed',error:String(e.message)});}
  return {schemaVersion:1,retrievedAt,sources,status,observations,publicationApproved:false,productionVerified:false,paidServices:false};
}
