import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// Reproducible private production infrastructure; does not deploy or grant users.
const source = readFileSync(new URL("../infra/aws/intelligence-customer-authorizer.py", import.meta.url), "utf8");
const table = "novapharm-intelligence-customer-access";
const name = "novapharm-intelligence-customer-authorizer-private";
const logGroup = "/aws/lambda/" + name;
const sub = (suffix) => "arn:" + "$" + "{AWS::Partition}:" + suffix;

export function buildPrivateCustomerAuthorizerTemplate() {
  return {
    AWSTemplateFormatVersion: "2010-09-09",
    Description: "NovaPharm Intelligence private read-only default-deny authorizer; no public API or customer activation.",
    Resources: {
      Logs: { Type: "AWS::Logs::LogGroup", Properties: { LogGroupName: logGroup, RetentionInDays: 30 } },
      Role: { Type: "AWS::IAM::Role", Properties: {
        RoleName: "novapharm-intelligence-customer-authorizer-readonly",
        AssumeRolePolicyDocument: {
          Version: "2012-10-17",
          Statement: [{ Effect: "Allow", Principal: { Service: "lambda.amazonaws.com" }, Action: "sts:AssumeRole" }],
        },
        Policies: [{ PolicyName: "intelligence-readonly", PolicyDocument: {
          Version: "2012-10-17",
          Statement: [
            { Effect: "Allow", Action: ["dynamodb:GetItem"],
              Resource: { "Fn::Sub": sub("dynamodb:" + "$" + "{AWS::Region}:" + "$" + "{AWS::AccountId}:table/" + table) } },
            { Effect: "Allow", Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
              Resource: { "Fn::Sub": sub("logs:" + "$" + "{AWS::Region}:" + "$" + "{AWS::AccountId}:log-group:" + logGroup + ":*") } },
          ],
        } }],
      } },
      Function: { Type: "AWS::Lambda::Function", DependsOn: ["Logs"], Properties: {
        FunctionName: name, Description: "Private read-only customer authorizer; release disabled",
        Runtime: "python3.12", Handler: "index.handler",
        Role: { "Fn::GetAtt": ["Role", "Arn"] },
        Timeout: 8, MemorySize: 128, Code: { ZipFile: source },
        Environment: { Variables: { NPI_CUSTOMER_ACCESS_ENABLED: "false", NPI_CUSTOMER_ACCESS_TABLE: table } },
        Tags: [{ Key: "application", Value: "novapharm-intelligence" }, { Key: "release-gate", Value: "default-deny" }],
      } },
    },
    Outputs: {
      FunctionArn: { Value: { "Fn::GetAtt": ["Function", "Arn"] } },
      ReleaseState: { Value: "DEFAULT_DENY_NO_CUSTOMERS" },
    },
  };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.stdout.write(JSON.stringify(buildPrivateCustomerAuthorizerTemplate(), null, 2) + "\n");
}
