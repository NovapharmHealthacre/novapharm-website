import assert from "node:assert/strict";
import test from "node:test";
import { buildEstateAudit } from "./audit-entire-novapharm-application-estate.mjs";

const audit = buildEstateAudit();

test("the source census covers all twelve app directories and five native projects",()=>{
  assert.equal(audit.summary.byKind["app-project"],12);
  assert.equal(audit.summary.byKind["native-project"],5);
  assert.deepEqual(audit.errors,[]);
  assert.equal(audit.summary.errors,0);
  assert.equal(audit.schema,"novapharm.full-estate-source-census.v1");
});

test("every registered corporate page, article, consumer SKU and ESCO reference is represented",()=>{
  assert.equal(audit.summary.byKind["corporate-page"],32);
  assert.equal(audit.summary.byKind["corporate-article"],6);
  assert.equal(audit.summary.byKind["nutraxin-sku"],19);
  assert.equal(audit.summary.byKind["esco-reference"],373);
  assert.equal(audit.summary.commerce.marketplaceSourceCandidates,392);
  assert.equal(audit.summary.distinctSourceRecords,523);
  const registered = audit.records.filter(x=>x.kind==="nutraxin-sku");
  assert.equal(new Set(registered.map(x=>x.route)).size,19);
  assert.ok(registered.every(x=>x.warehouseStockAndPaymentAcceptedByThisAudit===false));
  assert.ok(audit.records.filter(x=>x.kind==="esco-reference").every(x =>
    !x.isIndividualIndexablePage && !x.listedAsVerifiedStock && !x.exactSupplierVariantAccepted));
});

test("every Portal and Intelligence module is individually reviewed as source-only",()=>{
  assert.equal(audit.summary.byKind["portal-module"],54);
  assert.equal(audit.summary.portal.navigationVisible,48);
  assert.equal(audit.summary.portal.dependencyGated,6);
  assert.equal(audit.summary.portal.ownerControlledWriteCodeNotReleased,5);
  assert.deepEqual(audit.summary.portal.byArea,{customer:18,employee:13,executive:18,admin:5});
  const modules=audit.records.filter(x=>x.kind==="portal-module");
  assert.equal(new Set(modules.map(x=>x.route)).size,54);
  assert.ok(modules.every(x=>x.access==="role-and-tenant-protected"));
  assert.ok(modules.every(x=>x.protectedLiveRouteVerified===false));
  assert.equal(audit.summary.byKind["intelligence-workspace"],22);
  assert.equal(audit.summary.intelligence.sourceReadOnly,5);
  assert.equal(audit.summary.intelligence.gated,17);
});

test("all 523 source rows explicitly refuse to infer production or human accessibility acceptance",()=>{
  assert.equal(audit.records.length,523);
  assert.ok(audit.records.every(x=>x.independentProductionEvidence===null));
  assert.ok(audit.records.every(x=>x.accessibilityAndSecurityApproval===null));
  assert.ok(audit.records.every(x=>x.ownerReleaseApproval===null));
  assert.ok(audit.records.every(x=>x.sourceTestAndPreviewDoesNotEstablishLiveOperation===true));
  assert.equal(audit.summary.independentProductionAcceptanceClaimedByThisSourceAudit,0);
  assert.match(audit.caveat,/source object, not an individually verified live page/);
});

test("each original source record has unique key and a raw source digest",()=>{
  assert.equal(new Set(audit.records.map(x=>x.kind+":"+x.id)).size,523);
  assert.ok(Object.keys(audit.sourceSha256).length>=10);
  assert.ok(Object.values(audit.sourceSha256).every(s=>/^[0-9a-f]{64}$/.test(s)));
});

test("no production authorisation is fabricated for a source census",()=>{
  assert.equal(audit.summary.ownerProductionSignoff,"not_granted");
  assert.ok(audit.records.some(x=>x.kind==="native-project" && x.id==="novapharm-intelligence-ios"));
  assert.ok(audit.records.some(x=>x.kind==="native-project" && x.id==="novapharm-intelligence-android"));
});
