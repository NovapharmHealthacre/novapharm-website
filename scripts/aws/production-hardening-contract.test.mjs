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
  "infra/aws/nutraxin-stripe-webhook-production.json": "novapharm-production-nutraxin-stripe-events"
};
const protectedTableNames = new Set([
  'novapharm-intelligence-billing-webhook-events',
  'novapharm-production-esco-payment-ledger',
  'novapharm-production-contact-inbox',
]);
function template(path) {
  return JSON.parse(readFileSync(new URL(path, root), 'utf8'));
}
test('seven production HTTP stages preserve existing metadata-only access logs', () => {
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
