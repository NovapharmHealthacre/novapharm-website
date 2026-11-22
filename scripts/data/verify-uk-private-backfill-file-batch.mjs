import {readPrivateBackfillPlan,verifyUkPrivateBackfillBatch} from '../../src/core/uk-private-backfill-file-batch.mjs';
try{
 const a=process.argv.slice(2);
 if(a.length!==4||a[0]!=='--root'||a[2]!=='--plan')
  throw new Error('expected root and plan');
 const plan=await readPrivateBackfillPlan(a[1],a[3]);
 const result=await verifyUkPrivateBackfillBatch({plan,quarantineRoot:a[1]});
 process.stdout.write(JSON.stringify(result)+'\n');
}catch{
 process.stderr.write('UK private backfill verification refused; no medicine data admitted.\n');
 process.exitCode=1;
}
