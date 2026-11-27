import {ingestTreasury} from '../src/core/finance-market-intelligence.mjs';
if(!process.argv.includes('--live')){
 console.error('Usage: node scripts/ingest-finance-treasury.mjs --live');
 process.exitCode=2;
}else{
 const result=await ingestTreasury();
 process.stdout.write(JSON.stringify(result,null,2)+'\n');
 if(!result.observations.length||result.status.some(s=>s.state==='failed'))process.exitCode=1;
}
