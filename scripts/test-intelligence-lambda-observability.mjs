import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const template = JSON.parse(readFileSync(new URL("../infra/aws/intelligence-lambda-observability.json", import.meta.url), "utf8"));
const expected = new Map([
  ["AuthorizerErrors", ["novapharm-intelligence-customer-authorizer-errors", "novapharm-intelligence-customer-authorizer-private", "Errors"]],
  ["AuthorizerThrottles", ["novapharm-intelligence-customer-authorizer-throttles", "novapharm-intelligence-customer-authorizer-private", "Throttles"]],
  ["TerminalErrors", ["novapharm-intelligence-terminal-candidate-errors", "novapharm-intelligence-private-terminal-candidate", "Errors"]],
  ["OfficialResearchErrors", ["novapharm-intelligence-public-research-errors", "novapharm-intelligence-public-official-research", "Errors"]],
]);

test("only the four explicitly scoped, non-notifying Intelligence alarms exist", () => {
  assert.equal(template.AWSTemplateFormatVersion, "2010-09-09");
  assert.deepEqual(Object.keys(template.Resources).sort(), [...expected.keys()].sort());
  for (const [key, [alarmName, fn, metricName]] of expected) {
    const r = template.Resources[key];
    assert.equal(r.Type, "AWS::CloudWatch::Alarm");
    const p = r.Properties;
    assert.equal(p.AlarmName, alarmName);
    assert.equal(p.Namespace, "AWS/Lambda");
    assert.equal(p.MetricName, metricName);
    assert.deepEqual(p.Dimensions, [{ Name: "FunctionName", Value: fn }]);
    assert.equal(p.ActionsEnabled, false);
    assert.equal(p.Period, 300);
    assert.equal(p.Threshold, 1);
    assert.equal(p.EvaluationPeriods, 1);
    assert.equal(p.DatapointsToAlarm, 1);
    assert.equal(p.TreatMissingData, "notBreaching");
    assert.equal(p.ComparisonOperator, "GreaterThanOrEqualToThreshold");
    assert.equal(p.AlarmActions, undefined);
    assert.equal(p.OKActions, undefined);
    assert.equal(p.InsufficientDataActions, undefined);
  }
  assert.equal(JSON.stringify(template).includes("OPENAI_API_KEY"), false);
  assert.equal(JSON.stringify(template).includes("lambda:InvokeFunction"), false);
});

test("the baseline cannot claim model inference or external release", () => {
  const names = Object.values(template.Resources).map(x => x.Properties.AlarmName);
  assert.equal(names.some(name => name.includes("nova-inference")), false);
  assert.equal(JSON.stringify(template).includes("AWS::Lambda::Function"), false);
  assert.equal(JSON.stringify(template).includes("AWS::SNS::Subscription"), false);
});
