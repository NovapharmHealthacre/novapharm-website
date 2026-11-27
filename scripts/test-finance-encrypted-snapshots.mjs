import assert from 'node:assert/strict';
import test from 'node:test';
import {randomBytes} from 'node:crypto';
import {createFinanceSnapshotService,createFinanceS3Storage} from '../src/core/finance-encrypted-snapshots.mjs';
const time='2026-11-27T00:00:00Z';
const ref={tenant:'t1',entity:'e1',id:'snapshot1',source:'worldBank'};
const snapshot={retrievedAt:time,publicationApproved:false,productionVerified:false,observations:[{source:'worldBank',retrievedAt:time,value:123}]};
function fixture(){
 const objects=new Map(),keys=new Map(),events=[];
 const provider={async generate(){const key=randomBytes(32),wrappedKey=randomBytes(32);keys.set(wrappedKey.toString('hex'),Buffer.from(key));return {keyId:'test',plaintextKey:key,wrappedKey};},async unwrap({wrappedKey}){return Buffer.from(keys.get(wrappedKey.toString('hex')));}};
 const storage={async create({key,envelope}){if(objects.has(key))throw Error('exists');objects.set(key,structuredClone(envelope));},async read({key}){return structuredClone(objects.get(key));}};
 const service=createFinanceSnapshotService({provider,storage,verifyAccess:async({actor,scope})=>actor==='board'&&scope.tenant==='t1'?{allowed:true,subject:'test-board'}:{allowed:false},audit:async event=>{events.push(event);}});
 return {service,objects,events};
}
test('authorized encrypted snapshot roundtrip, metadata-only audit',async()=>{
 const {service,objects,events}=fixture();await service.save({actor:'board',ref,snapshot});
 const [envelope]=objects.values();assert.equal(envelope.algorithm,'aes-256-gcm');assert.equal(Object.hasOwn(envelope,'observations'),false);
 assert.deepEqual(await service.read({actor:'board',ref}),snapshot);
 assert.ok(events.every(e=>!Object.hasOwn(e,'snapshot')&&e.subject==='test-board'));
});
test('deny cross-tenant and unauthorized reads and writes',async()=>{
 const {service,objects}=fixture();
 await assert.rejects(service.save({actor:'employee',ref,snapshot}),/denied/);
 await assert.rejects(service.read({actor:'board',ref:{...ref,tenant:'t2'}}),/denied/);
 assert.equal(objects.size,0);
});
test('no overwrite, publication self-approval or source mismatch',async()=>{
 const {service,objects}=fixture();await service.save({actor:'board',ref,snapshot});
 await assert.rejects(service.save({actor:'board',ref,snapshot}),/could not be saved/);
 await assert.rejects(service.save({actor:'board',ref:{...ref,id:'another'},snapshot:{...snapshot,publicationApproved:true}}));
 await assert.rejects(service.save({actor:'board',ref:{...ref,id:'another',source:'ecb'},snapshot}));
 assert.equal(objects.size,1);
});
test('tampered ciphertext and transplanted record denied',async()=>{
 const {service,objects}=fixture();await service.save({actor:'board',ref,snapshot});
 const [key,envelope]=objects.entries().next().value;
 objects.set(key.replace('snapshot1.json','snapshot2.json'),envelope);
 await assert.rejects(service.read({actor:'board',ref:{...ref,id:'snapshot2'}}),/unavailable/);
 objects.set(key,{...envelope,tag:Buffer.alloc(16).toString('base64')});
 await assert.rejects(service.read({actor:'board',ref}),/unavailable/);
});
test('S3 adapter requires encrypted objects and create-only AES256 policy',async()=>{
 let request;const storage=createFinanceS3Storage({bucket:'finance-fixture',putObject:async x=>{request=x;},getObjectBytes:async()=>Buffer.from('{"algorithm":"aes-256-gcm"}')});
 const key='finance/v1/t1/e1/snapshot-worldBank/snapshot1.json';
 await assert.rejects(storage.create({key,envelope:{plaintext:'unsafe'}}));
 await storage.create({key,envelope:{algorithm:'aes-256-gcm',ciphertext:'fixture'}});
 assert.equal(request.IfNoneMatch,'*');assert.equal(request.ServerSideEncryption,'AES256');
 assert.deepEqual(await storage.read({key}),{algorithm:'aes-256-gcm'});
 await assert.rejects(storage.read({key:'../outside'}));
});
