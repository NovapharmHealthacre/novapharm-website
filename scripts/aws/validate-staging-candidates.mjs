import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

export function validateAuditStaging(t) {
  assert.deepEqual(t.Parameters.Environment.AllowedValues, ["staging"], "Audit candidate is staging-only");
  const trail = t.Resources.AuditTrail?.Properties || {};
  const bucket = t.Resources.AuditBucket?.Properties || {};
  assert.equal(trail.IsLogging, true, "Management-event trail must log");
  assert.equal(trail.IsMultiRegionTrail, false, "Free trial single Region only");
  assert.equal(trail.IncludeGlobalServiceEvents, false, "No cross-Region event delivery");
  assert.equal(trail.EnableLogFileValidation, true, "CloudTrail log digest verification must be enabled");
  assert.ok(Array.isArray(trail.EventSelectors) && trail.EventSelectors.length === 1, "One event selector");
  const selector = trail.EventSelectors[0];
  assert.equal(selector.IncludeManagementEvents, true);
  assert.equal(selector.ReadWriteType, "All");
  assert.deepEqual(selector.DataResources, [], "Do not enable chargeable data-event logging");
  assert.equal(bucket.PublicAccessBlockConfiguration.BlockPublicAcls, true);
  assert.equal(bucket.PublicAccessBlockConfiguration.BlockPublicPolicy, true);
  assert.equal(bucket.PublicAccessBlockConfiguration.IgnorePublicAcls, true);
  assert.equal(bucket.PublicAccessBlockConfiguration.RestrictPublicBuckets, true);
  assert.equal(bucket.BucketEncryption.ServerSideEncryptionConfiguration[0].ServerSideEncryptionByDefault.SSEAlgorithm, "AES256");
  assert.equal(bucket.VersioningConfiguration.Status, "Enabled");
  assert.equal(t.Resources.AuditBucket.DeletionPolicy, "Retain", "Retain audit evidence");
  const statements = t.Resources.AuditBucketPolicy.Properties.PolicyDocument.Statement;
  assert.ok(statements.some(s => s.Effect === "Deny" && s.Condition?.Bool?.["aws:SecureTransport"] === "false"), "Require TLS for S3");
  assert.ok(statements.some(s => s.Action === "s3:PutObject" && JSON.stringify(s.Condition).includes("aws:SourceArn")), "Scope CloudTrail PutObject to specific trail");
  return true;
}

export function validatePrivateSqlStaging(t) {
  assert.deepEqual(t.Parameters.Environment.AllowedValues, ["staging"], "RDS candidate is staging-only");
  const db = t.Resources.SqlExpressDatabase?.Properties || {};
  assert.equal(db.Engine, "sqlserver-ex", "SQL Server Express edition only");
  assert.equal(t.Parameters.DbClass.Default, "db.t3.micro", "Free-trial micro only");
  assert.deepEqual(t.Parameters.DbClass.AllowedValues, ["db.t3.micro"], "Never upgrade DB class silently");
  assert.equal(db.PubliclyAccessible, false, "No publicly reachable DB");
  assert.equal(db.StorageEncrypted, true);
  assert.equal(db.DeletionProtection, true);
  assert.equal(db.ManageMasterUserPassword, true, "Master password must be generated/stored in Secrets Manager");
  assert.ok(!Object.hasOwn(db, "MasterUserPassword"), "No password inline in CloudFormation");
  assert.equal(db.MultiAZ, false, "Do not enable chargeable Multi-AZ without approval");
  assert.ok(db.BackupRetentionPeriod >= 7, "Daily backups retained 7+ days");
  assert.equal(t.Resources.SqlExpressDatabase.DeletionPolicy, "Snapshot");
  assert.equal(t.Resources.SqlExpressDatabase.UpdateReplacePolicy, "Snapshot");
  for (const name of ["PrivateSubnetA", "PrivateSubnetB"]) {
    assert.equal(t.Resources[name].Properties.MapPublicIpOnLaunch, false, "Private DB subnet must disable public IPs");
  }
  assert.ok(!JSON.stringify(t.Resources).includes("0.0.0.0/0"), "No public network CIDR in DB candidate");
  const ingress = t.Resources.DatabaseIngressFromApi?.Properties || {};
  assert.equal(ingress.FromPort, 1433);
  assert.equal(ingress.ToPort, 1433);
  assert.deepEqual(ingress.SourceSecurityGroupId, { Ref: "ApiClientSecurityGroup" }, "Only API role security group can connect");
  return true;
}

if (process.argv[1]?.endsWith("validate-staging-candidates.mjs")) {
  const audit = JSON.parse(readFileSync("infra/aws/cloudtrail-staging.json", "utf8"));
  const db = JSON.parse(readFileSync("infra/aws/rds-sql-express-staging.json", "utf8"));
  validateAuditStaging(audit);
  validatePrivateSqlStaging(db);
  console.log("PASS: staging audit and private SQL Express IaC obey region, free-plan, retention and security gates. RDS is a source candidate only; no deployment.");
}
