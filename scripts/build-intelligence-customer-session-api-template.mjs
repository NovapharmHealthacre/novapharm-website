/**
 * Generate the exact AWS CloudFormation contract for the private customer
 * session API. No state changes occur from this script.
 *
 * IMPORTANT: Both release controls default OFF. Source merges or a healthy
 * Lambda do NOT approve customer access, licensed medicines or subscriptions.
 * Deployment with EnableCustomerRoutes=true must be independently authorized.
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const file = new URL("../infra/aws/intelligence-customer-session-api.py", import.meta.url);
const source = readFileSync(file, "utf8");
const sourceDigest = createHash("sha256").update(source).digest("hex");
const apiId = "q2e6ztf8ic";
const table = "novapharm-intelligence-customer-access";
const functionName = "novapharm-intelligence-customer-session-api";
const logName = "/aws/lambda/" + functionName;
const sub = (str) => ({ "Fn::Sub": str });
const ref = (id) => ({ Ref: id });

export function buildIntelligenceCustomerSessionTemplate() {
  const template = {
    AWSTemplateFormatVersion: "2010-09-09",
    Description: "Default-disabled customer identity sessions with DynamoDB transactional ownership and MFA authorisation. No users, email, or payments.",
    Parameters: {
      EnableCustomerRoutes: {
        Type: "String", Default: "false", AllowedValues: ["false", "true"],
        Description: "Expose only the reviewed customer-session API Gateway routes; disabled by default.",
      },
      CustomerLaunchAccepted: {
        Type: "String", Default: "false", AllowedValues: ["false", "true"],
        Description: "Never set true without complete signed customer, tenant, billing and source-rights release acceptance.",
      },
    },
    Conditions: {
      ExposeCustomerRoutes: { "Fn::Equals": [ref("EnableCustomerRoutes"), "true"] },
    },
    Resources: {
      Logs: {
        Type: "AWS::Logs::LogGroup",
        Properties: { LogGroupName: logName, RetentionInDays: 30 },
      },
      Role: {
        Type: "AWS::IAM::Role",
        Properties: {
          RoleName: "novapharm-intelligence-customer-session-api",
          AssumeRolePolicyDocument: {
            Version: "2012-10-17",
            Statement: [{ Effect: "Allow", Principal: { Service: "lambda.amazonaws.com" }, Action: "sts:AssumeRole" }],
          },
          Policies: [{
            PolicyName: "transactional-customer-sessions-only",
            PolicyDocument: {
              Version: "2012-10-17",
              Statement: [
                { Effect: "Allow", Action: ["dynamodb:GetItem", "dynamodb:Query", "dynamodb:TransactWriteItems"],
                  Resource: sub("arn:${AWS::Partition}:dynamodb:${AWS::Region}:${AWS::AccountId}:table/" + table) },
                { Effect: "Allow", Action: ["logs:CreateLogStream", "logs:PutLogEvents"],
                  Resource: sub("arn:${AWS::Partition}:logs:${AWS::Region}:${AWS::AccountId}:log-group:" + logName + ":*") },
              ],
            },
          }],
        },
      },
      Function: {
        Type: "AWS::Lambda::Function", DependsOn: ["Logs"],
        Properties: {
          FunctionName: functionName,
          Runtime: "python3.12", Handler: "index.handler",
          Description: "JWT and approved-ledger customer sessions; default OFF; no medicine data exposure.",
          Timeout: 10, MemorySize: 256,
          Role: { "Fn::GetAtt": ["Role", "Arn"] },
          Code: { ZipFile: source },
          Environment: { Variables: {
            NPI_CUSTOMER_ACCESS_ENABLED: ref("CustomerLaunchAccepted"),
            NPI_CUSTOMER_ACCESS_TABLE: table,
          } },
          Tags: [
            { Key: "application", Value: "novapharm-intelligence" },
            { Key: "environment", Value: "production" },
            { Key: "release-gate", Value: "default-off" },
            { Key: "source-sha256", Value: sourceDigest },
          ],
        },
      },
      GatewayIntegration: {
        Type: "AWS::ApiGatewayV2::Integration",
        Condition: "ExposeCustomerRoutes",
        Properties: {
          ApiId: apiId, IntegrationType: "AWS_PROXY", IntegrationMethod: "POST",
          IntegrationUri: { "Fn::GetAtt": ["Function", "Arn"] },
          PayloadFormatVersion: "2.0", TimeoutInMillis: 10000,
        },
      },
      CustomerJwtAuthorizer: {
        Type: "AWS::ApiGatewayV2::Authorizer",
        Condition: "ExposeCustomerRoutes",
        Properties: {
          ApiId: apiId, AuthorizerType: "JWT",
          Name: "novapharm-intelligence-customer-cognito-jwt",
          IdentitySource: ["$request.header.Authorization"],
          JwtConfiguration: {
            Issuer: "https://cognito-idp.eu-north-1.amazonaws.com/eu-north-1_jBL6hCUE2",
            Audience: ["7c76122stt76k4d8cjvd7tf6ck"],
          },
        },
      },
      CreateSession: {
        Type: "AWS::ApiGatewayV2::Route",
        Condition: "ExposeCustomerRoutes",
        Properties: {
          ApiId: apiId, RouteKey: "POST /customer/session",
          AuthorizationType: "JWT", AuthorizerId: ref("CustomerJwtAuthorizer"),
          Target: { "Fn::Join": ["/", ["integrations", ref("GatewayIntegration")]] },
        },
      },
      ReadSession: {
        Type: "AWS::ApiGatewayV2::Route",
        Condition: "ExposeCustomerRoutes",
        Properties: {
          ApiId: apiId, RouteKey: "GET /customer/session",
          AuthorizationType: "NONE",
          Target: { "Fn::Join": ["/", ["integrations", ref("GatewayIntegration")]] },
        },
      },
      RevokeSession: {
        Type: "AWS::ApiGatewayV2::Route",
        Condition: "ExposeCustomerRoutes",
        Properties: {
          ApiId: apiId, RouteKey: "POST /customer/logout",
          AuthorizationType: "NONE",
          Target: { "Fn::Join": ["/", ["integrations", ref("GatewayIntegration")]] },
        },
      },
      AllowGatewayInvoke: {
        Type: "AWS::Lambda::Permission", Condition: "ExposeCustomerRoutes",
        Properties: {
          Action: "lambda:InvokeFunction", FunctionName: ref("Function"),
          Principal: "apigateway.amazonaws.com",
          SourceArn: sub("arn:${AWS::Partition}:execute-api:${AWS::Region}:${AWS::AccountId}:" + apiId + "/*/*/customer/*"),
        },
      },
    },
    Outputs: {
      SessionFunctionArn: { Value: { "Fn::GetAtt": ["Function", "Arn"] } },
      SourceSha256: { Value: sourceDigest },
      RoutesExposed: { Value: ref("EnableCustomerRoutes") },
      CustomerAccessEnabled: { Value: ref("CustomerLaunchAccepted") },
    },
  };
  return template;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  process.stdout.write(JSON.stringify(buildIntelligenceCustomerSessionTemplate(), null, 2) + "\n");
}
