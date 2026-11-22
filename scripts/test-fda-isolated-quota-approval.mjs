import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const template=JSON.parse(read("infra/aws/fda-isolated-quota-approval.cfn.json"));
const approvals=["OwnerProductionSignoff","QuotaProvisioningApproved","SecurityAndIAMApproved","BudgetAndBillingApproved","IndependentReleaseAcceptance"];
const gate=template.Conditions.CreateApprovedQuota["Fn::And"];
const quota=template.Resources.FDAIsolatedQuotaTable;
function allowed(parameters={}) {
  const value=node=>typeof node!=="object" ? node :
    node.Ref==="AWS::Region" ? (parameters.__region??"eu-north-1") :
    node.Ref==="AWS::AccountId" ? (parameters.__accountId??"000000000000") :
    (parameters[node.Ref]??template.Parameters[node.Ref].Default);
  return gate.every(clause=>{
    const equality=clause["Fn::Equals"] ?? clause["Fn::Not"]?.[0]?.["Fn::Equals"];
    const equal=value(equality[0])===value(equality[1]);
    return clause["Fn::Not"] ? !equal : equal;
  });
}
test("source default creates ZERO DynamoDB resources and cannot grant identity or IAM",()=>{
 assert.equal(allowed(),false);
 assert.deepEqual(Object.keys(template.Resources),["FDAIsolatedQuotaTable"]);
 assert.equal(quota.Condition,"CreateApprovedQuota");
 assert.equal(quota.Type,"AWS::DynamoDB::Table");
 assert.equal(template.Parameters.QuotaTableName.Default,"UNAPPROVED");
 for(const key of approvals){
  assert.equal(template.Parameters[key].Default,"false");
  assert.deepEqual(template.Parameters[key].AllowedValues,["false","true"]);
 }
 assert.equal(gate.length,approvals.length+4);
 assert.equal(template.Parameters.ApprovedAwsAccountId.Default,"UNAPPROVED");
 assert.equal(template.Outputs.ApprovalResult.Value["Fn::If"][2],"disabled_zero_resources");
});
test("each independent approval AND explicit table identity is mandatory",()=>{
 const all=Object.fromEntries(approvals.map(k=>[k,"true"]));
 const accepted={...all,QuotaTableName:"novapharm-fda-quota-reviewed",
   ApprovedAwsAccountId:"123456789012",__accountId:"123456789012",__region:"eu-north-1"};
 assert.equal(allowed(all),false,"No deployment without approved account/table");
 assert.equal(allowed({...accepted,QuotaTableName:"UNAPPROVED"}),false);
 assert.equal(allowed({...accepted,ApprovedAwsAccountId:"UNAPPROVED"}),false);
 assert.equal(allowed({...accepted,__accountId:"999999999999"}),false);
 assert.equal(allowed({...accepted,__region:"us-east-1"}),false);
 for(const missing of approvals){
  assert.equal(allowed({...accepted,[missing]:"false"}),false,missing);
 }
 assert.equal(allowed(accepted),true);
});
test("single isolated DynamoDB table matches atomic quota PK/SK, TTL, encryption and retention",()=>{
 const p=quota.Properties;
 assert.equal(p.BillingMode,"PAY_PER_REQUEST");
 assert.deepEqual(p.KeySchema,[{AttributeName:"PK",KeyType:"HASH"},{AttributeName:"SK",KeyType:"RANGE"}]);
 assert.deepEqual(p.AttributeDefinitions,[{AttributeName:"PK",AttributeType:"S"},{AttributeName:"SK",AttributeType:"S"}]);
 assert.deepEqual(p.TimeToLiveSpecification,{AttributeName:"ttlEpoch",Enabled:true});
 assert.equal(p.SSESpecification.SSEEnabled,true);
 assert.equal(quota.DeletionPolicy,"Retain");
 assert.equal(quota.UpdateReplacePolicy,"Retain");
 assert.equal(p.TableName.Ref,"QuotaTableName");
 const quotaCode=read("src/core/regulatory/fda-dynamodb-quota.mjs");
 for(const fragment of ['PK:{S:"FDA_QUOTA#"','SK:{S:"MINUTE#"','"#ttl":"ttlEpoch"','ConditionExpression:"attribute_not_exists(#used) OR #used < :max"'])
  assert.ok(quotaCode.includes(fragment),fragment);
});
test("example IAM policy is scoped to atomic UpdateItem and HMAC partition prefix only",()=>{
 const iam=JSON.parse(read("infra/aws/fda-quota-least-privilege-policy.example.json"));
 assert.equal(iam.Version,"2012-10-17");
 assert.equal(iam.Statement.length,1);
 const stmt=iam.Statement[0];
 assert.equal(stmt.Effect,"Allow");
 assert.deepEqual(stmt.Action,["dynamodb:UpdateItem"]);
 assert.equal(stmt.Resource,"arn:aws:dynamodb:eu-north-1:APPROVED_ACCOUNT_ID:table/APPROVED_FDA_QUOTA_TABLE");
 assert.deepEqual(stmt.Condition,{"ForAllValues:StringLike":{"dynamodb:LeadingKeys":["FDA_QUOTA#*"]},"Null":{"dynamodb:LeadingKeys":"false"}});
 assert.ok(!JSON.stringify(iam).includes("novapharm-intelligence-customer-access"));
});
test("no default grants, static secrets, public endpoint or shared-table reference",()=>{
 const source=JSON.stringify(template);
 for(const token of ["AWS::IAM::","AWS::ApiGateway","AWS::Lambda::Permission","NPI_FDA_QUOTA_HMAC_SECRET","AWS::SecretsManager::Secret","novapharm-intelligence-customer-access"])
  assert.ok(!source.includes(token),token);
 assert.match(read("config/intelligence/owner-production-constraints.json"),/"productionSignoff"\s*:\s*"not_granted"/);
 const paths=[
  "infra/aws/fda-isolated-quota-approval.cfn.json",
  "infra/aws/fda-quota-least-privilege-policy.example.json",
  "scripts/test-fda-isolated-quota-approval.mjs",
  "docs/intelligence/fda-quota-approval-20261122.md",
  ".github/workflows/intelligence-fda-isolated-quota-contract.yml"
 ];
 for(const workflow of [".github/workflows/dispatch-approved-aws-contact-release.yml",".github/workflows/publish-aws-contact-production.yml"]){
  const contents=read(workflow);
  for(const path of paths) assert.ok(contents.includes(path),workflow+" must classify "+path);
 }
});
