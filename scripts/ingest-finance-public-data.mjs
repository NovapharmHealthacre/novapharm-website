import {ingest} from '../src/core/finance-public-data.mjs';
// Explicit execution; stdout is a local evidence snapshot, not a deployment.
if(!process.argv.includes('--live')) {
  console.error('Usage: node scripts/ingest-finance-public-data.mjs --live');
  process.exitCode=2;
} else {
  const result=await ingest();
  process.stdout.write(JSON.stringify(result,null,2)+'\n');
  if(!result.observations.length||result.status.some(s=>s.state==='failed')) process.exitCode=1;
}
