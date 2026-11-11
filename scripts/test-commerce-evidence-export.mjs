import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tpl=JSON.parse(readFileSync("infra/aws/commerce-evidence-scheduled-export-production.json","utf8"));
const res=tpl.Resources;
const source=res.EvidenceLambda.Properties.Code.ZipFile;
test("NOVA exporter uses private AWS evidence storage without public distribution",()=>{
 const lambda=res.EvidenceLambda.Properties;
 assert.equal(lambda.FunctionName,"novapharm-production-commerce-evidence-export");
 assert.equal(lambda.Runtime,"python3.12");
 assert.equal(lambda.Environment.Variables.EVIDENCE_BUCKET,"novapharm-intelligence-evidence-250675045172-eu-north-1");
 assert.equal(res.DailySchedule.Properties.State,"ENABLED");
 assert.equal(res.DailySchedule.Properties.ScheduleExpression,"cron(0 3 * * ? *)");
 assert(!("ReservedConcurrentExecutions" in lambda));
});
test("IAM source/sink access is strictly limited",()=>{
 const statements=res.EvidenceRole.Properties.Policies[0].PolicyDocument.Statement;
 assert.deepEqual(statements[0].Action,["dynamodb:Scan"]);
 assert.deepEqual(statements[1].Action,["s3:PutObject"]);
 assert.match(statements[1].Resource,/\/commerce\/owner-attestations\/\*$/);
 assert(!JSON.stringify(statements).includes('"Resource":"*"'));
 assert(!JSON.stringify(statements).includes("stripe"));
 assert(!JSON.stringify(statements).includes("dynamodb:UpdateItem"));
});
test("only source-labelled commercial assumptions are exported",()=>{
 assert.match(source,/EXPECTED = \{"Nutraxin": 19, "ESCO": 373\}/);
 assert.match(source,/if len\(records\) != 392/);
 assert.match(source,/"ownerConfirmedUnits": owner/);
 assert.match(source,/"ownerConfirmedRemainingUnits"/);
 assert.match(source,/"ownerConfirmedTotalUnits"/);
 assert.match(source,/"physicalStockVerified": False/);
 assert.match(source,/"physicalVerifiedUnits": None/);
 assert.match(source,/"availableToPromiseAccepted": False/);
 assert.match(source,/"availableToPromiseUnits": 0/);
 assert.match(source,/"evidenceType": "commercial_assumption"/);
 assert.match(source,/"excludedFromLiveForecast": True/);
 assert.match(source,/"salesTransactionsObserved": None/);
 assert.doesNotMatch(source,/stripe\.com|send_email|send_message|transact_write_items|update_item/);
});
