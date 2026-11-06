import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateAuditStaging, validatePrivateSqlStaging } from "./validate-staging-candidates.mjs";
const audit = JSON.parse(readFileSync("infra/aws/cloudtrail-staging.json", "utf8"));
const db = JSON.parse(readFileSync("infra/aws/rds-sql-express-staging.json", "utf8"));
const copy = x => JSON.parse(JSON.stringify(x));

test("CloudTrail single-region management-only encrypted bucket candidate accepted", () => {
  assert.equal(validateAuditStaging(audit), true);
});
test("CloudTrail data event logging is blocked", () => {
  const t = copy(audit);
  t.Resources.AuditTrail.Properties.EventSelectors[0].DataResources = [{ Type:"AWS::S3::Object", Values:["arn:aws:s3:::*/*"] }];
  assert.throws(() => validateAuditStaging(t), /chargeable data-event/);
});
test("CloudTrail open public bucket is blocked", () => {
  const t = copy(audit);
  t.Resources.AuditBucket.Properties.PublicAccessBlockConfiguration.BlockPublicPolicy = false;
  assert.throws(() => validateAuditStaging(t));
});
test("CloudTrail log digest cannot be disabled", () => {
  const t = copy(audit);
  t.Resources.AuditTrail.Properties.EnableLogFileValidation = false;
  assert.throws(() => validateAuditStaging(t));
});
test("RDS SQL Server Express micro is staged privately only", () => {
  assert.equal(validatePrivateSqlStaging(db), true);
});
test("RDS public exposure is blocked", () => {
  const t = copy(db);
  t.Resources.SqlExpressDatabase.Properties.PubliclyAccessible = true;
  assert.throws(() => validatePrivateSqlStaging(t));
});
test("RDS non-Express edition is blocked", () => {
  const t = copy(db);
  t.Resources.SqlExpressDatabase.Properties.Engine = "sqlserver-se";
  assert.throws(() => validatePrivateSqlStaging(t));
});
test("RDS premium class is blocked", () => {
  const t = copy(db);
  t.Parameters.DbClass.Default = "db.m6i.large";
  assert.throws(() => validatePrivateSqlStaging(t));
});
test("RDS embedded password is blocked", () => {
  const t = copy(db);
  t.Resources.SqlExpressDatabase.Properties.MasterUserPassword = "not-allowed";
  assert.throws(() => validatePrivateSqlStaging(t));
});
test("RDS unrestricted SQL ingress is blocked", () => {
  const t = copy(db);
  t.Resources.DatabaseIngressFromApi.Properties.SourceSecurityGroupId = { Ref: "OtherGroup" };
  assert.throws(() => validatePrivateSqlStaging(t));
});
test("RDS database backup and snapshot cannot be removed", () => {
  const t = copy(db);
  t.Resources.SqlExpressDatabase.Properties.BackupRetentionPeriod = 0;
  assert.throws(() => validatePrivateSqlStaging(t));
});
