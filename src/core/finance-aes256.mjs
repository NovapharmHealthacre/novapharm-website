import {createCipheriv,createDecipheriv,randomBytes} from 'node:crypto';
const ALGORITHM='aes-256-gcm', VERSION=1, MAX=8*1024*1024;
const fields=['tenant','entity','recordType','recordId'];
function context(input){
 if(!input||typeof input!=='object'||Object.keys(input).length!==fields.length)throw new Error('Invalid encryption context');
 const out={};
 for(const f of fields){
  if(!Object.hasOwn(input,f)||typeof input[f]!=='string'||!/^[A-Za-z0-9._:-]{1,128}$/.test(input[f]))throw new Error('Expected opaque context identifiers');
  out[f]=input[f];
 }
 return Object.freeze(out);
}
function keyId(value){if(typeof value!=='string'||!/^[A-Za-z0-9:/._-]{1,512}$/.test(value))throw new Error('Invalid key identifier');return value;}
function aad(ctx,id){return Buffer.from(JSON.stringify({version:VERSION,algorithm:ALGORITHM,keyId:id,context:ctx}),'utf8');}
function decode(s,max,exact){
 if(typeof s!=='string'||s.length>Math.ceil(max/3)*4||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s))throw new Error('Invalid encrypted envelope');
 const b=Buffer.from(s,'base64');
 if(b.toString('base64')!==s||b.length>max||(exact!==undefined&&b.length!==exact))throw new Error('Invalid encrypted envelope');
 return b;
}
function validateKey(key){if(!Buffer.isBuffer(key)||key.length!==32)throw new Error('AES-256 requires a 32-byte data key');}
function zero(key){if(key instanceof Uint8Array)key.fill(0);}
// Provider contract: generate(context) MUST generate a fresh random 256-bit data key
// per call; unwrap({keyId,wrappedKey,context}) MUST authenticate the key and context.
// Plaintext keys are caller-owned buffers and are wiped on return. No key caching.
export async function encryptFinanceRecord({plaintext,scope,provider}){
 if(!Buffer.isBuffer(plaintext)||plaintext.length>MAX)throw new Error('Invalid plaintext size or type');
 const ctx=context(scope);
 let material;
 try{
  material=await provider.generate(ctx);
  validateKey(material?.plaintextKey);
  const id=keyId(material.keyId);
  if(!Buffer.isBuffer(material.wrappedKey)||!material.wrappedKey.length||material.wrappedKey.length>8192)throw new Error('Invalid wrapped key');
  const iv=randomBytes(12),cipher=createCipheriv(ALGORITHM,material.plaintextKey,iv,{authTagLength:16});
  cipher.setAAD(aad(ctx,id));
  const ciphertext=Buffer.concat([cipher.update(plaintext),cipher.final()]);
  return {version:VERSION,algorithm:ALGORITHM,keyId:id,wrappedKey:material.wrappedKey.toString('base64'),iv:iv.toString('base64'),tag:cipher.getAuthTag().toString('base64'),ciphertext:ciphertext.toString('base64')};
 }finally{zero(material?.plaintextKey);}
}
export async function decryptFinanceRecord({envelope,scope,provider}){
 let key,chunk,tail;
 try{
  const ctx=context(scope);
  if(!envelope||typeof envelope!=='object'||Object.keys(envelope).length!==7||envelope.version!==VERSION||envelope.algorithm!==ALGORITHM)throw new Error('Invalid encrypted envelope');
  const id=keyId(envelope.keyId),wrappedKey=decode(envelope.wrappedKey,8192),iv=decode(envelope.iv,12,12),tag=decode(envelope.tag,16,16),ciphertext=decode(envelope.ciphertext,MAX);
  if(!wrappedKey.length)throw new Error('Invalid wrapped key');
  key=await provider.unwrap({keyId:id,wrappedKey,context:ctx});
  validateKey(key);
  const decipher=createDecipheriv(ALGORITHM,key,iv,{authTagLength:16});
  decipher.setAAD(aad(ctx,id));decipher.setAuthTag(tag);
  chunk=decipher.update(ciphertext);tail=decipher.final();
  return Buffer.concat([chunk,tail]);
 }catch{throw new Error('Finance record decryption failed');}
 finally{zero(key);zero(chunk);zero(tail);}
}
// Caller must authenticate and authorize the record before invoking this function.
// Caller must atomically persist the replacement and retain the old key until migration/restore verification.
export async function reencryptFinanceRecord({envelope,scope,oldProvider,newProvider}){
 const plaintext=await decryptFinanceRecord({envelope,scope,provider:oldProvider});
 try{return await encryptFinanceRecord({plaintext,scope,provider:newProvider});}
 finally{zero(plaintext);}
}
// Production adapter uses an injected authorized KMS client boundary, not a custom key store.
// Operations are GenerateDataKey (AES_256) and Decrypt; keys must be immutable allowlisted ARNs.
export function kmsFinanceProvider({generateDataKey,decryptDataKey,activeKeyArn,allowedKeyArns}){
 const arn=/^arn:aws(?:-[a-z]+)*:kms:[a-z0-9-]+:\d{12}:key\/[A-Za-z0-9-]+$/;
 const allowed=new Set(allowedKeyArns);
 if(!arn.test(activeKeyArn)||!allowed.has(activeKeyArn)||[...allowed].some(x=>!arn.test(x)))throw new Error('Invalid KMS key allowlist');
 const encryptionContext=ctx=>({application:'novapharm-finance',version:'1',...context(ctx)});
 return Object.freeze({
  async generate(ctx){
   const result=await generateDataKey({KeyId:activeKeyArn,KeySpec:'AES_256',EncryptionContext:encryptionContext(ctx)});
   let plaintextKey;
   try{
    if(result.KeyId!==activeKeyArn||!(result.Plaintext instanceof Uint8Array)||result.Plaintext.length!==32||!(result.CiphertextBlob instanceof Uint8Array)||!result.CiphertextBlob.length)throw new Error('Unexpected KMS response');
    plaintextKey=Buffer.from(result.Plaintext);
    return {keyId:result.KeyId,plaintextKey,wrappedKey:Buffer.from(result.CiphertextBlob)};
   }catch(e){zero(plaintextKey);throw e;}finally{zero(result?.Plaintext);}
  },
  async unwrap({keyId:id,wrappedKey,context:ctx}){
   if(!allowed.has(id))throw new Error('Unapproved KMS key');
   const result=await decryptDataKey({KeyId:id,CiphertextBlob:wrappedKey,EncryptionContext:encryptionContext(ctx),EncryptionAlgorithm:'SYMMETRIC_DEFAULT'});
   try{
    if(result.KeyId!==id||!(result.Plaintext instanceof Uint8Array)||result.Plaintext.length!==32)throw new Error('Unexpected KMS response');
    return Buffer.from(result.Plaintext);
   }finally{zero(result?.Plaintext);}
  }
 });
}
