// In-house financial analytics. All money arguments are integer minor units,
// in one verified currency and legal entity. Never executes financial actions.
function money(n){if(!Number.isSafeInteger(n)||n<0)throw new RangeError('Expected nonnegative integer minor units');return n;}
function signed(n){if(!Number.isSafeInteger(n))throw new RangeError('Unsafe monetary result');return n;}
export function contribution({netRevenue,acquisitionCost,logisticsCost,paymentFees,otherVariableCost}){
  const revenue=money(netRevenue),cost=signed([acquisitionCost,logisticsCost,paymentFees,otherVariableCost].reduce((sum,v)=>sum+money(v),0));
  const profit=signed(revenue-cost);
  return {revenue,cost,contribution:profit,margin:revenue===0?null:profit/revenue};
}
export function liquidityScenario({openingCash,periods}){
  let closing=money(openingCash),minimum=closing;
  if(!Array.isArray(periods)||periods.length===0||periods.length>366)throw new RangeError('Invalid period count');
  const path=periods.map((p,i)=>{
    const receipts=money(p.receipts),payments=money(p.payments);
    closing=signed(closing+signed(receipts-payments));minimum=Math.min(minimum,closing);
    return {period:i+1,receipts,payments,closingCash:closing};
  });
  return {path,minimumCash:minimum,closingCash:closing,firstShortfallPeriod:path.find(p=>p.closingCash<0)?.period??null,model:'deterministic_cash_flow',executionEligible:false};
}
export function concentration(exposures){
  if(!Array.isArray(exposures)||!exposures.length) return null;
  const values=exposures.map(money),total=signed(values.reduce((a,b)=>a+b,0));
  if(total===0)return null;
  const shares=values.map(v=>v/total);
  return {total,largestShare:Math.max(...shares),hhi:shares.reduce((a,v)=>a+v*v,0)};
}
