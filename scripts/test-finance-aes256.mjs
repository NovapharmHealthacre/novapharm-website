import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {encryptFinanceRecord,decryptFinanceRecord,reencryptFinanceRecord,kmsFinanceProvider} from '../src/core/finance-aes256.mjs';
const scope={tenant:'tenant-1',entity:'entity-1',recordType:'invoice',recordId:'record-1'};
const plaintext=Buffer.from('synthetic finance record');
// Test-only in-memory key provider. Never a production key store.
function fixture(keyId='fixture-1'){
 const keys=new Map(),returned=[];
 return {returned,provider:{
  async generate(ctx){const key=randomBytes(32),wrappedKey=randomBytes(32);keys.set(wrappedKey.toString('hex'),{key:Buffer.from(key),ctx:JSON.stringify(ctx)});returned.push(key);return {keyId,plaintextKey:key,wrappedKey};},
  async unwrap({keyId:id,wrappedKey,context}){const r=keys.get(wrappedKey.toString('hex'));if(id!==keyId||!r||r.ctx!==JSON.stringify(context))throw Error('denied');const key=Buffer.from(r.key);returned.push(key);return key;}
 }};
}
test('AES-256-GCM roundtrip, fresh keys and nonces, key buffer clearing',async()=>{
 const f=fixture(),opts={plaintext,scope,provider:f.provider};
 const a=await encryptFinanceRecord(opts),b=await encryptFinanceRecord(opts);
 assert.equal(a.algorithm,'aes-256-gcm');assert.notEqual(a.wrappedKey,b.wrappedKey);assert.notEqual(a.iv,b.iv);
 assert.equal(Buffer.from(a.iv,'base64').length,12);assert.equal(Buffer.from(a.tag,'base64').length,16);
 assert.deepEqual(await decryptFinanceRecord({envelope:a,scope,provider:f.provider}),plaintext);
 assert.ok(f.returned.every(k=>k.every(v=>v===0)));
});
test('tampering and malformed encoding rejected',async()=>{
 const f=fixture(),a=await encryptFinanceRecord({plaintext,scope,provider:f.provider});
 for(const field of ['iv','tag','ciphertext','wrappedKey']){
  const b=Buffer.from(a[field],'base64');b[0]^=1;
  await assert.rejects(decryptFinanceRecord({envelope:{...a,[field]:b.toString('base64')},scope,provider:f.provider}),/decryption failed/);
 }
 for(const mutation of [{version:2},{algorithm:'aes-128-gcm'},{tag:'AAAA'},{keyId:'fixture-2'},{ciphertext:'!'}]){
  await assert.rejects(decryptFinanceRecord({envelope:{...a,...mutation},scope,provider:f.provider}),/decryption failed/);
 }
});
test('all four record context fields are bound',async()=>{
 const f=fixture(),a=await encryptFinanceRecord({plaintext,scope,provider:f.provider});
 for(const field of Object.keys(scope))await assert.rejects(decryptFinanceRecord({envelope:a,scope:{...scope,[field]:'different'},provider:f.provider}),/decryption failed/);
});
test('GCM itself authenticates record context even with permissive test provider',async()=>{
 const f=fixture(),a=await encryptFinanceRecord({plaintext,scope,provider:f.provider});
 const provider={unwrap:args=>f.provider.unwrap({...args,context:scope})};
 await assert.rejects(decryptFinanceRecord({envelope:a,scope:{...scope,recordId:'record-2'},provider}),/decryption failed/);
});
test('key rotation re-encrypts and old key cannot decrypt new record',async()=>{
 const old=fixture('old'),next=fixture('next'),a=await encryptFinanceRecord({plaintext,scope,provider:old.provider});
 const b=await reencryptFinanceRecord({envelope:a,scope,oldProvider:old.provider,newProvider:next.provider});
 assert.equal(b.keyId,'next');assert.notEqual(a.wrappedKey,b.wrappedKey);
 assert.deepEqual(await decryptFinanceRecord({envelope:b,scope,provider:next.provider}),plaintext);
 await assert.rejects(decryptFinanceRecord({envelope:b,scope,provider:old.provider}));
});
test('reject wrong key length, clear key even on failure',async()=>{
 const key=randomBytes(16);
 await assert.rejects(encryptFinanceRecord({plaintext,scope,provider:{generate:async()=>({keyId:'bad',plaintextKey:key,wrappedKey:Buffer.from('test')})}}));
 assert.ok(key.every(v=>v===0));
});
test('reject unexpected context fields and unbounded payloads',async()=>{
 const f=fixture();
 await assert.rejects(encryptFinanceRecord({plaintext,scope:{...scope,email:'test@example.com'},provider:f.provider}));
 await assert.rejects(encryptFinanceRecord({plaintext:Buffer.alloc(8*1024*1024+1),scope,provider:f.provider}));
});
test('KMS provider requests AES_256 and binds context; unapproved key rejected',async()=>{
 const arn='arn:aws:kms:eu-west-2:000000000000:key/test-fixture';
 let request,raw;
 const p=kmsFinanceProvider({activeKeyArn:arn,allowedKeyArns:[arn],
  generateDataKey:async x=>{request=x;raw=randomBytes(32);return {KeyId:arn,Plaintext:raw,CiphertextBlob:Buffer.from('fixture')};},
  decryptDataKey:async()=>{throw Error('not exercised');}});
 await encryptFinanceRecord({plaintext,scope,provider:p});
 assert.equal(request.KeySpec,'AES_256');assert.equal(request.EncryptionContext.tenant,scope.tenant);assert.ok(raw.every(v=>v===0));
 await assert.rejects(p.unwrap({keyId:'unapproved',wrappedKey:Buffer.from('fixture'),context:scope}),/Unapproved/);
});
