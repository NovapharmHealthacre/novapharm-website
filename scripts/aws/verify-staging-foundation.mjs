import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const plannedTypes = {
  "AWS::ECS::Cluster": 1,
  "AWS::ECR::Repository": 6,
  "AWS::Logs::LogGroup": 6,
  "AWS::S3::Bucket": 2,
  "AWS::S3::BucketPolicy": 2
};

export function verifyFoundation(resources, repositories, groups, clusters, expectedRegion = "eu-north-1") {
  assert.equal(expectedRegion, "eu-north-1", "Workload must stay in eu-north-1");
  assert.equal(typeof resources?.StackResources?.length, "number", "CloudFormation stack resources must be present");
  assert.equal(resources.StackResources.length, 17, "Foundation has unexpected resource count; review infrastructure drift");
  const actualTypes = {};
  for (const resource of resources.StackResources) {
    assert.equal(resource.ResourceStatus, "CREATE_COMPLETE", "Foundation resource is not CREATE_COMPLETE: " + resource.LogicalResourceId);
    actualTypes[resource.ResourceType] = (actualTypes[resource.ResourceType] || 0) + 1;
  }
  assert.deepEqual(actualTypes, plannedTypes, "Foundation resource types differ from the reviewed baseline");

  assert.equal(repositories?.repositories?.length, 6, "Six private staging ECR repositories are required");
  for (const repository of repositories.repositories) {
    assert.match(repository.repositoryName || "", /^novapharm\/staging\/(corporate|api|founder|technology|status|portal)$/);
    assert.equal(repository.imageScanningConfiguration?.scanOnPush, true, "ECR scan-on-push must be enabled");
    assert.equal(repository.imageTagMutability, "IMMUTABLE", "ECR mutable tags must be prohibited");
    assert.equal(repository.encryptionConfiguration?.encryptionType, "AES256", "ECR encryption required");
  }
  assert.equal(new Set(repositories.repositories.map(x => x.repositoryName)).size, 6, "ECR registry names must be unique");

  assert.equal(groups?.logGroups?.length, 6, "Six application log groups are required");
  for (const log of groups.logGroups) {
    assert.match(log.logGroupName || "", /^\/novapharm\/staging\/(corporate|api|founder|technology|status|portal)$/);
    assert.equal(log.retentionInDays, 30, "Logging retention must be controlled at 30 days");
  }
  assert.equal(new Set(groups.logGroups.map(x => x.logGroupName)).size, 6, "Log group names must be unique");
  assert.equal(clusters?.clusterArns?.length, 1, "Exactly one ECS staging cluster expected");
  assert.match(clusters.clusterArns[0], /:cluster\/novapharm-staging$/);
  return { resourceCount: 17, repositories: 6, logGroups: 6, clusters: 1 };
}

if (process.argv[1]?.endsWith("verify-staging-foundation.mjs")) {
  try {
    if (process.argv.length !== 6) throw new Error("Expected four paths: stack-resources, ecr, log-groups, clusters");
    const inputs = process.argv.slice(2).map(path => JSON.parse(readFileSync(path, "utf8")));
    const result = verifyFoundation(...inputs, process.env.AWS_REGION);
    console.log("PASS: AWS staging foundation observed control contract", JSON.stringify(result));
  } catch (error) {
    console.error("AWS staging foundation verification failed:", error.message);
    process.exitCode = 1;
  }
}
