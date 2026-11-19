import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
const template=JSON.parse(readFileSync("infra/aws/nutraxin-customer-staging-monitoring.json","utf8"));
test("alarms exist only for bounded staging customer Lambda and regional API",()=>{
 const r=template.Resources;
 assert.equal(Object.keys(r).length,3);
 for(const v of Object.values(r)){
  assert.equal(v.Type,"AWS::CloudWatch::Alarm");
  assert.equal(v.Properties.ActionsEnabled,false);
  assert.equal(v.Properties.TreatMissingData,"notBreaching");
  assert.equal(v.Properties.Period,300);
  assert.ok(!("AlarmActions" in v.Properties));
  assert.ok(!("OKActions" in v.Properties));
 }
 const functions=Object.values(r).filter(x=>x.Properties.Namespace==="AWS/Lambda");
 assert.equal(functions.length,2);
 for(const item of functions)assert.deepEqual(item.Properties.Dimensions,[{"Name":"FunctionName","Value":"novapharm-staging-nutraxin-customer-bff"}]);
 assert.equal(r.HttpApi5xxAlarm.Properties.Namespace,"AWS/ApiGateway");
 assert.equal(r.HttpApi5xxAlarm.Properties.MetricName,"5xx");
 assert.deepEqual(r.HttpApi5xxAlarm.Properties.Dimensions,[{"Name":"ApiId","Value":"wgy9p7ad0d"},{"Name":"Stage","Value":"$default"}]);
 assert.ok(!JSON.stringify(template).includes("AWS::IAM"));
 assert.ok(!JSON.stringify(template).includes("AWS::Route53"));
 assert.ok(!JSON.stringify(template).includes("AWS::Lambda::Function"));
});
