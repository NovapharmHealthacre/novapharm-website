import ast
import copy
import importlib.util
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location("publisher",ROOT/"apps/wms-price-publisher/index.py")
w=importlib.util.module_from_spec(spec)
spec.loader.exec_module(w)
SKU="NP-CP-5010058089785"
NOW=1800000000
ID="12345678-1234-4123-8123-123456789abc"
TABLE="fixture"
def fixture():
    p={"sku":SKU,"gtin":SKU.removeprefix("NP-CP-"),"name":"Fixture","pack":"30 tablets","brand":"Fixture","category":"Vitamins","image":"/assets/media/products/connective/5010058089785/front-800.webp","productClass":"food_supplement","netMinor":500,"vatBasisPoints":2000,"grossMinor":600,"availableQuantity":10,"expiresAt":NOW+3600,"stockVerified":False,"supplyModel":"supplier_backed","orderingCapacityOnly":True,"supplierBackedOrdering":True}
    for k in ("identityConfirmed","imageRightsConfirmed","ukRetailApproved","priceApproved","vatTreatmentVerified","fulfilmentVerified","orderingEnabled","sellerDeliveryCommitment","labelInformationVerified"):
        p[k]=True
    return {**w.key(w.PARTITION,SKU),"offerJson":{"S":json.dumps(p)},"existingProvenance":{"S":"unchanged"}}
class Fake:
    def __init__(self):
        self.rows={(w.PARTITION,SKU):fixture()}
        self.writes=0
    def get_item(self,TableName,Key,ConsistentRead):
        assert TableName==TABLE and ConsistentRead
        return {"Item":copy.deepcopy(self.rows.get((Key["pk"]["S"],Key["sk"]["S"])))}
    def transact_write_items(self,TransactItems):
        u,p=TransactItems[0]["Update"],TransactItems[1]["Put"]
        row=self.rows[(w.PARTITION,SKU)]
        assert u["ConditionExpression"]=="offerJson = :before"
        assert row["offerJson"]==u["ExpressionAttributeValues"][":before"]
        assert p["ConditionExpression"]=="attribute_not_exists(pk)"
        assert (w.AUDIT,ID) not in self.rows
        row["offerJson"]=copy.deepcopy(u["ExpressionAttributeValues"][":after"])
        self.rows[(w.AUDIT,ID)]=copy.deepcopy(p["Item"])
        self.writes+=1
class Test(unittest.TestCase):
    def setUp(self):
        self.db=Fake()
        v=w.execute({"action":"inspect","sku":SKU},self.db,TABLE,NOW)
        self.request={"action":"publish_price","sku":SKU,"expectedHash":v["expectedHash"],"grossMinor":1200,"requestId":ID,"actor":"owner@example.test","draftRevision":1}
    def test_price_only_and_retry(self):
        before=json.loads(self.db.rows[(w.PARTITION,SKU)]["offerJson"]["S"])
        r=w.execute(self.request,self.db,TABLE,NOW,True)
        self.assertEqual(r["status"],"ledger_revision_confirmed")
        self.assertFalse(r["websiteVerified"])
        self.assertFalse(r["stripeVerified"])
        after=json.loads(self.db.rows[(w.PARTITION,SKU)]["offerJson"]["S"])
        self.assertEqual(after,{**before,"netMinor":1000,"grossMinor":1200})
        self.assertEqual(self.db.rows[(w.PARTITION,SKU)]["existingProvenance"],{"S":"unchanged"})
        self.assertEqual(w.execute(self.request,self.db,TABLE,NOW,True),r)
        self.assertEqual(self.db.writes,1)
        with self.assertRaisesRegex(w.Rejected,"idempotency_conflict"):
            w.execute({**self.request,"grossMinor":2400},self.db,TABLE,NOW,True)
    def test_rejections(self):
        for change,reason in [({"expectedHash":"0"*64},"stale_offer"),({"grossMinor":3},"gross_not_representable"),({"grossMinor":True},"invalid_revision"),({"availableQuantity":999},"unexpected_fields"),({"sku":"NUT-UK-TEST"},"unsupported_sku")]:
            with self.assertRaisesRegex(w.Rejected,reason):
                w.execute({**self.request,**change},self.db,TABLE,NOW,True)
        with self.assertRaisesRegex(w.Rejected,"publisher_disabled"):
            w.execute(self.request,self.db,TABLE,NOW)
        with self.assertRaisesRegex(w.Rejected,"existing_eligible_offer_required"):
            w.execute(self.request,self.db,TABLE,NOW+3601,True)
        self.assertEqual(self.db.writes,0)
    def test_verifier_and_template_parity(self):
        def fn(path):
            tree=ast.parse(path.read_text())
            return ast.dump(next(x for x in tree.body if isinstance(x,ast.FunctionDef) and x.name=="verified_retail_offer"),include_attributes=False)
        self.assertEqual(fn(ROOT/"apps/nutraxin-products-checkout/index.py"),fn(ROOT/"apps/wms-price-publisher/index.py"))
        t=json.loads((ROOT/"infra/aws/wms-private-price-publisher.json").read_text())
        self.assertEqual(t["Resources"]["Publisher"]["Properties"]["Code"]["ZipFile"],(ROOT/"apps/wms-price-publisher/index.py").read_text())
        self.assertEqual(t["Parameters"]["PublishEnabled"]["Default"],"false")
        self.assertFalse(any(x["Type"] in ("AWS::Lambda::Permission","AWS::Lambda::Url","AWS::ApiGatewayV2::Api") for x in t["Resources"].values()))
    def test_staging_template_isolation(self):
        raw=(ROOT/"infra/aws/wms-staging-price-publisher.json").read_text()
        t=json.loads(raw)
        resources=t["Resources"]
        self.assertNotIn("novapharm-production-",raw)
        self.assertEqual(t["Parameters"]["PublishEnabled"]["Default"],"false")
        self.assertEqual(resources["FixtureLedger"]["Properties"]["TableName"],"novapharm-staging-wms-price-fixture-ledger")
        self.assertEqual(resources["FixtureLedger"]["Properties"]["BillingMode"],"PAY_PER_REQUEST")
        self.assertTrue(resources["FixtureLedger"]["Properties"]["SSESpecification"]["SSEEnabled"])
        publisher=resources["Publisher"]["Properties"]
        self.assertEqual(publisher["FunctionName"],"novapharm-staging-wms-price-publisher")
        self.assertEqual(publisher["Environment"]["Variables"]["PAYMENT_LEDGER_TABLE"],{"Ref":"FixtureLedger"})
        self.assertEqual(publisher["Code"]["ZipFile"],(ROOT/"apps/wms-price-publisher/index.py").read_text())
        role=resources["PublisherRole"]["Properties"]
        self.assertNotIn("ManagedPolicyArns",role)
        for policy in role["Policies"]:
            for statement in policy["PolicyDocument"]["Statement"]:
                if any(action.startswith("dynamodb:") for action in ([statement["Action"]] if isinstance(statement["Action"],str) else statement["Action"])):
                    self.assertEqual(statement["Resource"],{"Fn::GetAtt":["FixtureLedger","Arn"]})
                    self.assertIn("dynamodb:LeadingKeys",statement["Condition"]["ForAllValues:StringEquals"])
        self.assertFalse(any(x["Type"] in ("AWS::Lambda::Permission","AWS::Lambda::Url","AWS::ApiGatewayV2::Api") for x in resources.values()))
if __name__=="__main__": unittest.main()
