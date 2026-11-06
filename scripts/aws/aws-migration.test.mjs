import test from "node:test";
import assert from "node:assert/strict";
import { AwsRdsSqlProvider } from "../../src/data/providers/aws-rds-sql.mjs";
import { DisabledDocumentStore } from "../../src/storage/providers/disabled-document-store.mjs";

const valid = {
  AWS_REGION: "eu-north-1",
  AWS_RDS_SQL_HOST: "novapharm.abcdef123456.eu-north-1.rds.amazonaws.com",
  AWS_RDS_SQL_DATABASE: "NovaPharm",
  AWS_RDS_SQL_USERNAME: "application_user",
  AWS_RDS_SQL_PASSWORD: "test-only-not-a-real-credential"
};

test("RDS SQL Server refuses any non-project Region before database connection", async () => {
  const provider = new AwsRdsSqlProvider({ ...valid, AWS_REGION: "us-east-1" });
  await assert.rejects(provider.initialize(), /eu-north-1/);
});
test("RDS SQL Server refuses a different Region endpoint", async () => {
  const provider = new AwsRdsSqlProvider({ ...valid, AWS_RDS_SQL_HOST: "novapharm.abcdef123456.us-east-1.rds.amazonaws.com" });
  await assert.rejects(provider.initialize(), /eu-north-1 RDS SQL Server/);
});
test("RDS SQL Server refuses missing injected protected password", async () => {
  const provider = new AwsRdsSqlProvider({ ...valid, AWS_RDS_SQL_PASSWORD: "" });
  await assert.rejects(provider.initialize(), /protected password/);
});
test("disabled document storage never accepts uploads or serves private data", async () => {
  const store = new DisabledDocumentStore();
  await store.initialize();
  assert.equal(store.requiresMalwareScan, true);
  assert.equal(store.status(), "aws_document_storage_disabled");
  await assert.rejects(store.putQuarantine({ bytes: Buffer.from("test"), objectName: "fake.pdf" }), /not activated/);
  await assert.rejects(store.read("s3://anything/private"), /not activated/);
  await assert.rejects(store.promote("s3://anything/unscanned"), /not authorised/);
  assert.equal((await store.scanStatus()).state, "error");
});
