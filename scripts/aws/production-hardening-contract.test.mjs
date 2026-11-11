import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const expectedApiGroups = {
  "infra/aws/commerce-stock-public-production.json": "novapharm-public-commerce-stock",
  "infra/aws/intelligence-public-official-research.json": "novapharm-intelligence-official-public-research",
  "infra/aws/intelligence-stripe-subscription-webhook.json": "novapharm-intelligence-stripe-billing-webhook",
  "infra/aws/esco-products-checkout-production.json": "novapharm-production-esco-checkout",
  "infra/aws/contact-production.json": "novapharm-contact-production",
  "infra/aws/nutraxin-products-checkout-api.json": "novapharm-production-nutraxin-products-checkout",
  "infra/aws/nutraxin-stripe-webhook-production.json": "novapharm-production-nutraxin-stripe-events",
  "infra/aws/nutraxin-customer-staging-stack.json": "novapharm-nutraxin-customer-staging"
};
const protectedTableNames = new Set([
  'novapharm-intelligence-billing-webhook-events',
  'novapharm-production-esco-payment-ledger',
  'novapharm-production-contact-inbox',
]);
function template(path) {
  return JSON.parse(readFileSync(new URL(path, root), 'utf8'));
}
test('eight JSON HTTP stage templates preserve metadata-only access logs', () => {
  for (const [path, group] of Object.entries(expectedApiGroups)) {
    const stages = Object.values(template(path).Resources ?? {}).filter(
      resource => resource.Type === 'AWS::ApiGatewayV2::Stage'
    );
    assert.equal(stages.length, 1, `${path} must have exactly one HTTP stage`);
    const log = stages[0].Properties.AccessLogSettings;
    assert.ok(log, `${path} must configure access logging`);
    assert.equal(
      log.DestinationArn['Fn::Sub'].endsWith(`/aws/apigateway/${group}`),
      true,
      `${path} must reference its existing log group`
    );
    const format = JSON.parse(log.Format);
    assert.equal(format.requestId, '$context.requestId');
    assert.equal(format.status, '$context.status');
    assert.equal(format.route, '$context.routeKey');
    assert.equal(format.latencyMs, '$context.responseLatency');
    assert.equal(Object.keys(format).some(key => /body|email|token|authorization|cookie/i.test(key)), false);
  }
});
test('three CloudFormation-owned production DynamoDB tables preserve PITR and deletion protection', () => {
  const observed = new Set();
  for (const path of Object.keys(expectedApiGroups)) {
    for (const resource of Object.values(template(path).Resources ?? {})) {
      if (resource.Type !== 'AWS::DynamoDB::Table') continue;
      const tableName = resource.Properties?.TableName;
      if (!protectedTableNames.has(tableName)) continue;
      assert.equal(resource.Properties.DeletionProtectionEnabled, true, tableName);
      assert.equal(resource.Properties.PointInTimeRecoverySpecification?.PointInTimeRecoveryEnabled, true, tableName);
      observed.add(tableName);
    }
  }
  assert.deepEqual([...observed].sort(), [...protectedTableNames].sort());
});

test('synthetic staging contact HTTP stage preserves metadata-only logs', () => {
  const path = 'infra/aws/contact-synthetic-staging.yaml';
  const yaml = readFileSync(new URL(path, root), 'utf8');
  const section = yaml.match(/\\n  Stage:\\n    Type: AWS::ApiGatewayV2::Stage\\n    Properties:\\n([\\s\\S]*?)\\n  InvokePermission:/);
  assert.ok(section, 'contact staging must have an HTTP stage');
  assert.ok(section[1].includes('AccessLogSettings:'), 'contact staging must have access logs');
  assert.ok(section[1].includes('/aws/apigateway/novapharm-contact-synthetic-staging'), 'stage destination must match deployed log group');
  assert.ok(section[1].includes('$context.requestId'));
  assert.ok(section[1].includes('$context.status'));
  assert.ok(!/requestBody|authorizer.claims|authorization|cookie/i.test(section[1]));
});
test('the nine permitted HTTP API log-writers are scoped to exact API IDs and groups', () => {
  const stored = template('infra/aws/policies/novapharm-http-api-scoped-log-delivery.json');
  assert.equal(stored.PolicyName, 'NovapharmHttpApiScopedLogDelivery');
  const policy = JSON.parse(stored.PolicyDocument);
  assert.equal(policy.Version, '2012-10-17');
  const groups = Object.values(expectedApiGroups).concat('novapharm-contact-synthetic-staging').sort();
  const statements = policy.Statement;
  assert.equal(statements.length, 9);
  assert.equal(new Set(statements.map(statement => statement.Sid)).size, 9);
  assert.deepEqual(statements.map(s => s.Resource.split('/aws/apigateway/')[1]?.replace(/:\\*$/, '')).sort(), groups);
  for (const statement of statements) {
    assert.equal(statement.Effect, 'Allow');
    assert.equal(statement.Principal?.Service, 'apigateway.amazonaws.com');
    assert.deepEqual(statement.Action.slice().sort(), ['logs:CreateLogStream','logs:PutLogEvents'].sort());
    const arn = statement.Condition?.ArnLike?.['aws:SourceArn'];
    assert.match(arn, /^arn:aws:execute-api:eu-north-1:250675045172:[a-z0-9]{10}\/\\*$/);
    assert.match(statement.Resource, /^arn:aws:logs:eu-north-1:250675045172:log-group:\/aws\/apigateway\/novapharm-[a-z0-9-]+:\\*$/);
  }
  assert.ok(stored.PolicyDocument.length <= 5120, 'CloudWatch resource-policy size must stay within limit');
});
