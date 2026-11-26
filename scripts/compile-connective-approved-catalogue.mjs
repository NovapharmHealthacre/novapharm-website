// Private evidence -> public catalogue projection. Dry run unless --write is supplied.
// Run with a private intake JSON outside the repository and a local approved image tree.
// Never commit the intake, commercial offers, or rights evidence containing private terms.
import {readFileSync,existsSync,realpathSync,mkdirSync,writeFileSync,renameSync} from 'node:fs';
import {resolve,dirname,sep} from 'node:path';
import {createHash} from 'node:crypto';
import {validGtin} from '../src/core/multibrand-retail.mjs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';

const classes=new Set(['food_supplement','cosmetic','consumer_non_medicinal']);
const required=['description','ingredients','directions','warnings'];
const evidenceKeys=['ukPack','imageRights','label','publication'];
const present=(v,max=5000)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
const evidenceValid=e=>e&&present(e.reference,1000)&&present(e.reviewedBy,200)&&/^\d{4}-\d{2}-\d{2}$/.test(e.reviewedOn||'')&&e.confirmed===true;
export function compileCatalogue(records,root,verifyImage=verifyLocalImage){
 assert(Array.isArray(records),'Expected private intake records');
 const approved=[],blocked=[],seen=new Set();
 for(const r of records){
  assert(r&&validGtin(r.ean)&&r.sku==='NP-CP-'+r.ean&&!seen.has(r.ean),'Duplicate or invalid catalogue identity');
  seen.add(r.ean);
  const reasons=[];
  if(!classes.has(r.productClass)) reasons.push('product class');
  for(const k of ['brand','name','category','pack']) if(!present(r[k],120)) reasons.push(k);
  for(const k of required) if(!present(r[k])) reasons.push(k);
  for(const k of ['identityConfirmed','imageRightsConfirmed','publicListingApproved']) if(r[k]!==true) reasons.push(k);
  for(const k of evidenceKeys) if(!evidenceValid(r.evidence?.[k])) reasons.push(k+' evidence');
  if(!verifyImage(root,r)) reasons.push('pack image checksum or path');
  if(reasons.length){blocked.push({ean:r.ean,reasons});continue;}
  // Explicit allowlist: never serialize draft prices, costs, private references, or supplier terms.
  approved.push({ean:r.ean,brand:r.brand,name:r.name,category:r.category,pack:r.pack,
   productClass:r.productClass,image:r.image,description:r.description,ingredients:r.ingredients,
   directions:r.directions,warnings:r.warnings,identityConfirmed:true,imageRightsConfirmed:true,publicListingApproved:true});
 }
 return {approved,blocked};
}
function verifyLocalImage(root,r){
 try{
  if(!new RegExp('^/assets/media/products/connective/'+r.ean+'/front-(480|800|1600)\\.webp$').test(r.image)||!/^[0-9a-f]{64}$/.test(r.imageSha256||''))return false;
  const base=realpathSync(root),file=realpathSync(resolve(base,r.image.slice(1)));
  if(!file.startsWith(base+sep))return false;
  const bytes=readFileSync(file);
  return bytes.length>12&&bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP'&&createHash('sha256').update(bytes).digest('hex')===r.imageSha256;
 }catch{return false;}
}
function selfTest(){
 const e={reference:'test only',reviewedBy:'fixture',reviewedOn:'2026-11-26',confirmed:true};
 const base={ean:'5010058089785',sku:'NP-CP-5010058089785',brand:'Fixture',name:'Fixture',category:'Fixture',pack:'30 tablets',productClass:'food_supplement',image:'/test.webp',description:'fixture',ingredients:'fixture',directions:'fixture',warnings:'fixture',identityConfirmed:true,imageRightsConfirmed:true,publicListingApproved:true,evidence:Object.fromEntries(evidenceKeys.map(k=>[k,e])),privateOfferDraft:{cost:1}};
 const result=compileCatalogue([base],'.',()=>true);
 assert.equal(result.approved.length,1);assert.equal(result.blocked.length,0);
 assert(!('privateOfferDraft' in result.approved[0]));assert(!('evidence' in result.approved[0]));
 for(const override of [{imageRightsConfirmed:false},{productClass:'medicine'},{ingredients:null},{evidence:{}},{publicListingApproved:false}]){
  assert.equal(compileCatalogue([{...base,...override}],'.',()=>true).approved.length,0);
 }
 assert.equal(compileCatalogue([base],'.',()=>false).approved.length,0);
 assert.throws(()=>compileCatalogue([base,base],'.',()=>true));
 console.log('Connective catalogue compiler self-test passed');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 const args=process.argv.slice(2);
 if(args.includes('--self-test'))selfTest();
 else{
  const value=k=>args[args.indexOf(k)+1];
  assert(args.includes('--input'),'Use --input /private/intake.json [--root .] [--write]');
  const root=resolve(args.includes('--root')?value('--root'):'.');
  const input=resolve(value('--input'));
  assert(!input.startsWith(root+sep),'Private intake must be outside the repository');
  const {approved,blocked}=compileCatalogue(JSON.parse(readFileSync(input,'utf8')).records,root);
  console.log(JSON.stringify({approved:approved.length,blocked},null,2));
  if(args.includes('--write')){
   assert(approved.length>0,'No approved products; catalogue not modified');
   const target=resolve(root,'src/content/approved-consumer-catalogue.json');
   const prior=existsSync(target)?JSON.parse(readFileSync(target,'utf8')):[];
   assert(Array.isArray(prior),'Existing public catalogue is invalid');
   const allowed=new Set(Object.keys(approved[0]).concat(['gallery']));
   assert(prior.every(p=>p&&Object.keys(p).every(k=>allowed.has(k))&&validGtin(p.ean)),'Existing catalogue contains unknown or private fields');
   const next=new Map(prior.map(p=>[p.ean,p]));
   for(const p of approved)next.set(p.ean,p);
   mkdirSync(dirname(target),{recursive:true});
   const tmp=target+'.tmp';
   writeFileSync(tmp,JSON.stringify([...next.values()],null,2)+'\n',{flag:'wx'});
   renameSync(tmp,target);
   console.log('Public catalogue updated; no checkout or payment settings changed');
  }
 }
}
