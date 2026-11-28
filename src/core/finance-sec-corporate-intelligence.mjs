// SEC public EDGAR adapter: no API subscription or filing permissions.
const ROOT='https://data.sec.gov/api/xbrl/companyfacts/';
const SOURCE='https://www.sec.gov/search-filings/edgar-application-programming-interfaces';
const FORMS=new Set(['10-K','10-K/A','10-Q','10-Q/A','20-F','20-F/A','40-F','40-F/A','6-K','6-K/A']);
export const CONCEPTS=Object.freeze({
 'us-gaap':['Assets','Liabilities','StockholdersEquity','CashAndCashEquivalentsAtCarryingValue','RevenueFromContractWithCustomerExcludingAssessedTax','Revenues','NetIncomeLoss','OperatingIncomeLoss','NetCashProvidedByUsedInOperatingActivities'],
 'ifrs-full':['Assets','Liabilities','Equity','CashAndCashEquivalents','Revenue','ProfitLoss','CashFlowsFromUsedInOperatingActivities']
});
function cikString(value){
 if(typeof value!=='string'||!/^[0-9]{1,10}$/.test(value)||/^0+$/.test(value))throw new Error('Invalid SEC CIK');
 return value.padStart(10,'0');
}
function date(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;}
function userAgent(s){
 if(typeof s!=='string'||s.length>200||/[\r\n]/.test(s)||!/^.+\s+[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s))throw new Error('Configure an organization and monitored contact email for SEC fair access');
 return s;
}
export function normalizeCompanyFacts({payload,cik,asOf,retrievedAt}){
 const id=cikString(cik);
 if(!date(asOf)||!date(retrievedAt?.slice(0,10))||asOf>retrievedAt.slice(0,10)||cikString(String(payload?.cik))!==id||typeof payload.entityName!=='string'||!payload.facts||typeof payload.facts!=='object')throw new Error('Invalid SEC company facts');
 const result=new Map();
 for(const [taxonomy,concepts] of Object.entries(CONCEPTS))for(const concept of concepts){
  const units=payload.facts[taxonomy]?.[concept]?.units;
  if(!units||typeof units!=='object')continue;
  for(const [unit,rows] of Object.entries(units)){
   if(!/^[A-Z]{3}$/.test(unit)||!Array.isArray(rows))continue;
   for(const row of rows){
    if(!FORMS.has(row.form)||!date(row.end)||!date(row.filed)||row.filed>asOf||row.end>row.filed||typeof row.val!=='number'||!Number.isSafeInteger(row.val)||!/^\d{10}-\d{2}-\d{6}$/.test(row.accn))continue;
    if(row.start!==undefined&&(!date(row.start)||row.start>row.end))continue;
    const item={cik:id,company:payload.entityName,taxonomy,concept,unit,value:row.val,start:row.start??null,end:row.end,filed:row.filed,form:row.form,accession:row.accn,source:'sec-edgar',sourceUrl:SOURCE,retrievedAt,publicationStatus:'review_required'};
    const key=JSON.stringify([taxonomy,concept,unit,item.start,item.end,item.filed,item.accession,item.form]);
    if(result.has(key)&&result.get(key).value!==item.value)throw new Error('Conflicting SEC filing facts');
    result.set(key,item);
   }
  }
 }
 return [...result.values()].sort((a,b)=>b.filed.localeCompare(a.filed)||a.concept.localeCompare(b.concept)||a.end.localeCompare(b.end)||a.accession.localeCompare(b.accession));
}
// Sequential single-CIK fetch. Deployment must enforce the SEC's aggregate fair-access limit across workers.
export async function ingestCompanyFacts({cik,contact,fetcher=fetch,now=new Date(),asOf=now.toISOString().slice(0,10)}){
 const id=cikString(cik),agent=userAgent(contact),retrievedAt=now.toISOString();
 if(!date(asOf)||asOf>retrievedAt.slice(0,10))throw new Error('Invalid as-of date');
 try{
  const response=await fetcher(ROOT+'CIK'+id+'.json',{signal:AbortSignal.timeout(25000),redirect:'error',headers:{'User-Agent':agent,Accept:'application/json'}});
  if(!response.ok)throw new Error('SEC HTTP '+response.status);
  const reader=response.body?.getReader();
  if(!reader)throw new Error('Missing response stream');
  const chunks=[];let size=0;
  try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>32*1024*1024){await reader.cancel();throw new Error('SEC response exceeds size limit');}chunks.push(Buffer.from(value));}}finally{reader.releaseLock();}
  const facts=normalizeCompanyFacts({payload:JSON.parse(Buffer.concat(chunks).toString('utf8')),cik:id,asOf,retrievedAt});
  if(!facts.length)throw new Error('No usable SEC facts');
  return {cik:id,asOf,retrievedAt,facts,state:'retrieved',publicationApproved:false,productionVerified:false};
 }catch(e){return {cik:id,asOf,retrievedAt,facts:[],state:'failed',error:String(e.message),publicationApproved:false,productionVerified:false};}
}
