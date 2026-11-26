export function pharmacyComparison({retail,current,proposed,units,branches}) {
 const bounds=(v,min,max)=>Math.min(max,Math.max(min,Number.isFinite(Number(v))?Number(v):min));
 const net=bounds(retail,0,10000)/1.2;
 const quantity=Math.floor(bounds(units,0,100000))*Math.floor(bounds(branches,1,10000));
 const old=net*bounds(current,0,100)/100*quantity;
 const next=net*bounds(proposed,0,100)/100*quantity;
 const round=v=>Math.round((v+Number.EPSILON*Math.max(1,Math.abs(v)))*100)/100;
 return {old:round(old),next:round(next),difference:round((next-old)*12)};
}
if(typeof document!=="undefined"){
 const panel=document.querySelector("[data-pharmacy-calculator]");
 if(panel){
  const field=name=>panel.querySelector('[data-npp="'+name+'"]');
  const money=new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"});
  const update=()=>{
   const result=pharmacyComparison(Object.fromEntries(["retail","current","proposed","units","branches"].map(k=>[k,field(k).valueAsNumber])));
   field("old").textContent=money.format(result.old);
   field("new").textContent=money.format(result.next);
   field("difference").textContent=money.format(result.difference);
  };
  panel.addEventListener("input",update);
  update();
 }
}
