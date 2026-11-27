"use client";
import { type FormEvent, useEffect, useState } from "react";
import { gatewayJson, professionalError, protectedMutation } from "../lib/gateway";

type Draft={sku:string;supplier:string;name:string;brand:string;pack:string;gtin:string|null;grossPriceMinor:number|null;vatBasisPoints:number|null;proposedQuantity:number|null;websiteVisible:boolean;revision:number;updatedAt?:string};
type Product={sku:string;supplier:string;name:string;brand:string;pack:string|null;gtin:string|null;sourcePriceMinor:number|null;draft:Draft|null;catalogueAdmission:string};
type Catalogue={total:number;matching:number;offset:number;limit:number;canEdit:boolean;publicationEnabled:false;records:Product[]};
const path="enterprise/wms/commerce-products";
const blank:Draft={sku:"NP-NEW-",supplier:"other",name:"",brand:"",pack:"",gtin:null,grossPriceMinor:null,vatBasisPoints:null,proposedQuantity:null,websiteVisible:false,revision:0};
export function WmsCommerceEditor(){
 const [data,setData]=useState<Catalogue|null>(null),[search,setSearch]=useState(""),[supplier,setSupplier]=useState(""),[offset,setOffset]=useState(0),[refresh,setRefresh]=useState(0);
 const [draft,setDraft]=useState<Draft|null>(null),[message,setMessage]=useState(""),[loading,setLoading]=useState(false),[saving,setSaving]=useState(false);
 useEffect(()=>{let active=true;setLoading(true);setData(null);const params=new URLSearchParams({q:search,supplier,offset:String(offset),refresh:String(refresh)});gatewayJson<Catalogue>(`${path}?${params}`).then(r=>{if(active)setData(r);}).catch(e=>{if(active)setMessage(professionalError(e));}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[search,supplier,offset,refresh]);
 function select(p:Product){if(saving)return;setMessage("");setDraft(p.draft??{...blank,sku:p.sku,supplier:p.supplier,name:p.name,brand:p.brand,pack:p.pack??"",gtin:p.gtin,grossPriceMinor:null});}
 function change<K extends keyof Draft>(key:K,value:Draft[K]){if(saving)return;setDraft(d=>d?{...d,[key]:value}:null);}
 async function save(e:FormEvent){e.preventDefault();if(!data?.canEdit||!draft||saving)return;setSaving(true);setMessage("");try{const {revision,updatedAt: _updatedAt,...fields}=draft;const response=await protectedMutation<{draft:Draft;status:string;publicationEnabled:false}>(path,{...fields,expectedRevision:revision});if(response.status!=="draft_saved"||response.publicationEnabled!==false)throw new Error("Unexpected response");setDraft(response.draft);setMessage("Draft saved. Live website, stock and payments have not changed.");setRefresh(v=>v+1);}catch(error){setMessage(professionalError(error));}finally{setSaving(false);}}
 return <section className="distribution-wms-pilot" aria-labelledby="wms-commerce-title">
 <p className="distribution-employee-overline">NOVAPHARM DISTRIBUTION / COMMERCE</p><h2 id="wms-commerce-title">Product master.</h2>
 <p>Search catalogue references and prepare commercial changes. Published prices and physical stock are not inferred from this register.</p>
 <div className="distribution-wms-pilot-form">
 <label htmlFor="wms-commerce-search">Search SKU, GTIN or product</label><input id="wms-commerce-search" value={search} onChange={e=>{setSearch(e.target.value);setOffset(0);}}/>
 <label htmlFor="wms-commerce-supplier">Supplier</label><select id="wms-commerce-supplier" value={supplier} onChange={e=>{setSupplier(e.target.value);setOffset(0);}}><option value="">All suppliers</option>{["nutraxin","connective","esco","s1","other"].map(s=><option key={s} value={s}>{s}</option>)}</select>
 {data?.canEdit?<button type="button" disabled={saving} onClick={()=>{setDraft({...blank});setMessage("");}}>New product draft</button>:null}
 </div>
 {loading?<p role="status">Loading catalogue…</p>:null}
 {data?<><p>{data.matching} matching of {data.total} records.</p><div className="distribution-wms-pilot-table"><table><caption>Product references</caption><thead><tr><th scope="col">SKU</th><th scope="col">Product</th><th scope="col">Source price</th><th scope="col">Draft</th></tr></thead><tbody>{data.records.map(p=><tr key={p.sku}><th scope="row">{p.sku}</th><td>{p.name}</td><td>{p.sourcePriceMinor===null?"Not recorded":new Intl.NumberFormat("en-GB",{style:"currency",currency:"GBP"}).format(p.sourcePriceMinor/100)}</td><td>{data.canEdit?<button type="button" onClick={()=>select(p)}>{p.draft?"Edit draft":"Prepare draft"}</button>:"Read only"}</td></tr>)}</tbody></table></div><div className="distribution-employee-links"><button type="button" disabled={offset===0} onClick={()=>setOffset(v=>Math.max(0,v-40))}>Previous</button><button type="button" disabled={offset+40>=data.matching} onClick={()=>setOffset(v=>v+40)}>Next</button></div></>:null}
 {draft&&data?.canEdit?<form className="distribution-wms-pilot-form" onSubmit={save} aria-busy={saving}><h3>Product draft</h3>
 <label htmlFor="wms-draft-sku">SKU</label><input id="wms-draft-sku" value={draft.sku} disabled={saving||draft.revision>0||!draft.sku.startsWith("NP-NEW-")} onChange={e=>change("sku",e.target.value.toUpperCase())} required/>
 <label htmlFor="wms-draft-supplier">Supplier</label><select id="wms-draft-supplier" value={draft.supplier} disabled={saving||draft.revision>0||!draft.sku.startsWith("NP-NEW-")} onChange={e=>change("supplier",e.target.value)}>{["nutraxin","connective","esco","s1","other"].map(s=><option key={s}>{s}</option>)}</select>
 <label htmlFor="wms-draft-name">Product name</label><input id="wms-draft-name" value={draft.name} onChange={e=>change("name",e.target.value)} required/>
 <label htmlFor="wms-draft-brand">Brand</label><input id="wms-draft-brand" value={draft.brand} onChange={e=>change("brand",e.target.value)} required/>
 <label htmlFor="wms-draft-pack">Pack</label><input id="wms-draft-pack" value={draft.pack} onChange={e=>change("pack",e.target.value)} required/>
 <label htmlFor="wms-draft-gtin">GTIN</label><input id="wms-draft-gtin" value={draft.gtin??""} onChange={e=>change("gtin",e.target.value||null)}/>
 <label htmlFor="wms-draft-price">Proposed gross price (GBP)</label><input id="wms-draft-price" type="number" step="0.01" min="0.01" value={draft.grossPriceMinor===null?"":draft.grossPriceMinor/100} onChange={e=>change("grossPriceMinor",e.target.value===""?null:Math.round(Number(e.target.value)*100))}/>
 <label htmlFor="wms-draft-vat">Proposed VAT</label><select id="wms-draft-vat" value={draft.vatBasisPoints??""} onChange={e=>change("vatBasisPoints",e.target.value===""?null:Number(e.target.value))}><option value="">Not confirmed</option><option value="0">0%</option><option value="500">5%</option><option value="2000">20%</option></select>
 <label htmlFor="wms-draft-quantity">Proposed quantity (not physical availability)</label><input id="wms-draft-quantity" type="number" min="0" step="1" value={draft.proposedQuantity??""} onChange={e=>change("proposedQuantity",e.target.value===""?null:Number(e.target.value))}/>
 <label><input type="checkbox" checked={draft.websiteVisible} onChange={e=>change("websiteVisible",e.target.checked)}/> Request website visibility</label>
 <button type="submit" disabled={saving}>{saving?"Saving…":"Save draft"}</button><button type="button" disabled={saving} onClick={()=>setDraft(null)}>Close editor</button><p>Publishing and photo upload are not enabled in this release.</p></form>:null}
 <p role="status" aria-live="polite">{message}</p></section>;
}
