import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const current = JSON.parse(readFileSync("infra/aws/commerce-evidence-scheduled-export-production.json", "utf8"));
const unreleased = JSON.parse(readFileSync("infra/aws/commerce-evidence-exporter-unreleased-code-candidate-20261111.json", "utf8"));
const res = current.Resources;
const source = res.EvidenceLambda.Properties.Code.ZipFile;
const futureSource = unreleased.Resources.EvidenceLambda.Properties.Code.ZipFile;
const NEW_BUCKET = "novapharm-commerce-evidence-250675045172-eu-north-1";

test("exact live exporter infrastructure targets isolated S3 without touching the daily schedule", () => {
  const lambda = res.EvidenceLambda.Properties;
  assert.equal(lambda.FunctionName, "novapharm-production-commerce-evidence-export");
  assert.equal(lambda.Runtime, "python3.12");
  assert.equal(lambda.Environment.Variables.EVIDENCE_BUCKET, NEW_BUCKET);
  assert.equal(res.DailySchedule.Properties.State, "ENABLED");
  assert.equal(res.DailySchedule.Properties.ScheduleExpression, "cron(0 3 * * ? *)");
  assert(!("ReservedConcurrentExecutions" in lambda));
  assert.equal(source.length, 3874, "Exact deployed function code remains preserved until separately accepted");
});

test("the current source grants the right writer one private isolated destination only", () => {
  const statements = res.EvidenceRole.Properties.Policies[0].PolicyDocument.Statement;
  assert.deepEqual(statements[0].Action, ["dynamodb:Scan"]);
  assert.deepEqual(statements[1].Action, ["s3:PutObject"]);
  assert.equal(statements[1].Resource, "arn:aws:s3:::" + NEW_BUCKET + "/commerce/owner-attestations/*");
  assert(!JSON.stringify(statements).includes('"Resource":"*"'));
  assert(!JSON.stringify(statements).includes("stripe"));
  assert(!JSON.stringify(statements).includes("dynamodb:UpdateItem"));
});

test("deployed source emits only correctly labelled owner assumptions and no real sales", () => {
  assert.match(source, /EXPECTED = \{"Nutraxin": 19, "ESCO": 373\}/);
  assert.match(source, /if len\(records\) != 392/);
  assert.match(source, /"physicalStockVerified": False/);
  assert.match(source, /"physicalVerifiedUnits": None/);
  assert.match(source, /"availableToPromiseAccepted": False/);
  assert.match(source, /"availableToPromiseUnits": 0/);
  assert.match(source, /"evidenceType": "commercial_assumption"/);
  assert.match(source, /"excludedFromLiveForecast": True/);
  assert.match(source, /"salesTransactionsObserved": None/);
  assert.doesNotMatch(source, /stripe\.com|send_email|send_message|transact_write_items|update_item/);
});

test("future enhanced export remains an UNRELEASED candidate, independently contracted", () => {
  assert.equal(unreleased.Resources.EvidenceLambda.Properties.Environment.Variables.EVIDENCE_BUCKET, NEW_BUCKET);
  assert(futureSource.length > source.length, "The proposed improved exporter must not be silently substituted for live code");
  assert.match(futureSource, /"ownerConfirmedUnits": owner/);
  assert.match(futureSource, /"ownerConfirmedRemainingUnits"/);
  assert.match(futureSource, /"ownerConfirmedTotalUnits"/);
  assert.match(futureSource, /"physicalStockVerified": False/);
  assert.match(futureSource, /"availableToPromiseAccepted": False/);
  assert.match(futureSource, /"evidenceType": "commercial_assumption"/);
  assert.match(futureSource, /"excludedFromLiveForecast": True/);
  assert.match(futureSource, /"salesTransactionsObserved": None/);
  assert.doesNotMatch(futureSource, /stripe\.com|send_email|send_message|transact_write_items|update_item/);
});
