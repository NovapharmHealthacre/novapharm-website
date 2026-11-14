import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { reviewWmsOperationalExceptionWorklist } from "../src/core/wms-operational-exception-worklist.mjs";

const section=(title,rows)=>({title,rows});
const sample=(sections,extra={})=>({
  module:{code:"employee.warehouse"},readOnly:true,actions:[],sections,...extra
});

test("seven observed sources become a traceable but non-executing review worklist",()=>{
  const out=reviewWmsOperationalExceptionWorklist(sample([
    section("Warehouse exception review",[
      {reason:"EXPIRED_BATCH",batchNumber:"BATCH-001"},
      {reason:"EXPIRY_WITHIN_90_DAYS",batchNumber:"BATCH-002"},
    ]),
    section("Receiving and purchasing evidence",[
      {po_number:"PO-001",receipt_number:"GR-001",received_quantity:20,rejected_quantity:2},
    ]),
    section("Quality and recall observations",[
      {complaint_number:"QC-001",severity:"high",status:"open"},
    ]),
    section("Return isolation review",[
      {return_number:"RMA-001",quality_hold:1},
    ]),
    section("Shipment and carrier observations",[
      {shipment_number:"SHIP-001",shipment_status:"delivered",delivered_at:null,tracking_reference:null},
    ]),
    section("Integration delivery exceptions",[
      {destination_system:"POLAR-SPEED",event_type:"inventory",status:"blocked"},
    ]),
    section("Commercial fulfilment queue",[
      {order_number:"ORDER-001",status:"on_hold"},
    ]),
  ]));
  assert.equal(out.status,"bounded_application_observations");
  assert.equal(out.observedSignals,9);
  assert.equal(out.rows.length,9);
  assert.equal(out.missingSources.length,0);
  assert.equal(out.rows[0].priority,"high");
  for(const row of out.rows){
    assert.equal(row.evidenceState,"application_record_not_3pl_reconciled");
    assert.ok(row.observationKey.includes(":"));
    assert.ok(row.reviewOwner.length>0);
    assert.ok(["high","standard"].includes(row.priority));
    assert.ok(Object.isFrozen(row));
  }
  for(const field of ["networkCoverageVerified","warehouseCommandIssued",
    "qualityDispositionIssued","shipmentAuthorised","saleAuthorised","externalIncidentCreated"])
    assert.equal(out[field],false,field);
  assert.equal(out.sampleLimited,true);
});

test("unavailable feeds and no recorded flags are unknown, not cleared",()=>{
  const out=reviewWmsOperationalExceptionWorklist(sample([
    section("Warehouse exception review",[])
  ]));
  assert.equal(out.status,"bounded_application_observations");
  assert.equal(out.rows.length,0);
  assert.equal(out.missingSources.length,6);
  assert.equal(out.networkCoverageVerified,false);
  assert.ok(out.reasons.some(x=>x.includes("zero_recorded_signals")));
});

test("non-warehouse view, mutable actions, and bad section input are denied",()=>{
  const invalid=[
    null,
    {},
    sample([], {module:{code:"customer.dashboard"}}),
    sample([], {readOnly:false}),
    sample([], {actions:[{code:"dispatch"}]}),
    sample(null),
  ];
  for(const input of invalid){
    const result=reviewWmsOperationalExceptionWorklist(input);
    assert.equal(result.status,"blocked");
    assert.equal(result.observedSignals,null);
    assert.equal(result.warehouseCommandIssued,false);
  }
});

test("resolved quality cases and non-held returns do not create false work items",()=>{
  const out=reviewWmsOperationalExceptionWorklist(sample([
    section("Quality and recall observations",[{complaint_number:"QC-001",status:"closed"}]),
    section("Return isolation review",[{return_number:"RMA-002",quality_hold:0}]),
    section("Shipment and carrier observations",[{shipment_number:"SHP-002",shipment_status:"pending"}]),
    section("Integration delivery exceptions",[{destination_system:"OTHER",status:"delivered"}]),
  ]));
  assert.equal(out.rows.length,0);
  assert.equal(out.networkCoverageVerified,false);
});

test("bounded samples and masked malformed references do not expand claims",()=>{
  const rows=Array.from({length:140},(_,i)=>({
    complaint_number:i===0?"owner@email.example":`QC-${i+1000}`,status:"open"
  }));
  const out=reviewWmsOperationalExceptionWorklist(sample([
    section("Quality and recall observations",rows),
  ]));
  assert.equal(out.rows.length,120);
  assert.equal(out.worklistTruncated,true);
  assert.equal(out.observedSignals,120);
  assert.equal(out.rows.some(x=>x.reference==="owner@email.example"),false);
  assert.ok(out.rows.some(x=>x.reference==="Not recorded"));
});

test("WMS overlay displays the worklist after five-layer and batch review",()=>{
  const overlay=readFileSync("src/core/enterprise-module-overlays.mjs","utf8");
  assert.match(overlay,/reviewWmsOperationalExceptionWorklist/);
  assert.match(overlay,/NovaPharm Distribution exception worklist/);
  assert.match(overlay,/employee-authorised application evidence only/);
  assert.match(overlay,/zero flags are unknown/);
  assert.doesNotMatch(overlay,/warehouseCommandIssued\s*=\s*true/);
});
