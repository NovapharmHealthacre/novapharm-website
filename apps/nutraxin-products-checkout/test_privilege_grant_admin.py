import copy
import hashlib
import json
import time
import unittest
from unittest.mock import patch
import test_public_checkout as checkout
from privilege_grant_admin import issue_approved_grant, S, N


class Ledger:
    def __init__(self):
        self.rows={}
        self.transactions=[]

    def get_item(self, *, Key, **kwargs):
        return {"Item":copy.deepcopy(self.rows.get(Key["pk"]["S"],{}))}

    def transact_write_items(self, *, TransactItems):
        self.transactions.append(copy.deepcopy(TransactItems))
        proposed=copy.deepcopy(self.rows)
        update=TransactItems[0]["Update"]
        put=TransactItems[1]["Put"]
        old=proposed[update["Key"]["pk"]["S"]]
        names=update["ExpressionAttributeNames"]
        values=update["ExpressionAttributeValues"]
        for clause in update["ConditionExpression"].split(" AND "):
            name,value=clause.split(" = ")
            if old.get(names[name])!=values[value]:
                raise RuntimeError("conditional conflict")
        key=put["Item"]["pk"]["S"]
        if key in proposed:
            raise RuntimeError("conditional conflict")
        if len(TransactItems)==3:
            c=TransactItems[2]["ConditionCheck"]
            prior=proposed[c["Key"]["pk"]["S"]]
            v=c["ExpressionAttributeValues"]
            if prior.get("customerSub")!=v[":subject"] or prior.get("status")!=v[":paid"] or prior.get("ownerCommercialPolicy")!=v[":policy"]:
                raise RuntimeError("conditional conflict")
        old.update(status=values[":issued"],issuedAtUnix=values[":now"],grantDigest=values[":grant"])
        proposed[key]=put["Item"]
        self.rows=proposed


class GrantIssuanceTests(unittest.TestCase):
    def setUp(self):
        self.db=Ledger()
        self.instant=int(time.time())
        self.subject="consumer_"+"1"*32
        self.campaign="WELCOME-ONCE-V1"
        self.approval_id="a"*32
        self.key="PROMO_APPROVAL#"+self.approval_id
        self.db.rows[self.key]={"pk":S(self.key),"sk":S("META"),"status":S("APPROVED"),
            "customerSub":S(self.subject),"promotionCode":S("WELCOME10"),"campaignId":S(self.campaign),
            "promotionRevision":S("r1"),"priorOrderId":S("NONE"),
            "commercialReviewRef":S("MARGIN-REVIEW-1"),"operatorReviewRef":S("REVIEW-1"),
            "commercialApproved":{"BOOL":True},"expiresAtUnix":N(self.instant+60),
            "grantExpiresAtUnix":N(self.instant+600)}
        self.policy={"retail_promotions":{"enabled":True,"campaigns":{"WELCOME10":{
            "approved":True,"starts_at":self.instant-10,"ends_at":self.instant+900,
            "discount_bps":1000,"sku_min_net_minor":{"NUT-UK-VD3-T120":800},
            "revision":"r1","minimum_gross_minor":1000,
            "audience":"first_account_once","campaign_id":self.campaign,
            "privilege_kind":"welcome","discoverable":True}}}}
        self.api=checkout.API
        self.patches=[patch.object(self.api,"PAYMENT_DDB",self.db),
            patch.object(self.api.SSM,"get_parameter",side_effect=lambda **kw:{"Parameter":{"Value":json.dumps(self.policy)}}),
            patch.object(self.api,"account_purchase_stage",return_value="no_recorded_paid_orders")]
        for p in self.patches:
            p.start()
            self.addCleanup(p.stop)

    def issue(self,enabled=True):
        return issue_approved_grant(self.api,self.approval_id,instant=self.instant,release_enabled=enabled)

    def test_default_off_and_unreviewed_approval(self):
        with self.assertRaises(ValueError): self.issue(False)
        self.db.rows[self.key]["commercialApproved"]={"BOOL":False}
        with self.assertRaises(ValueError): self.issue()
        self.assertEqual(self.db.transactions,[])

    def test_issuance_consumes_approval_and_cannot_repeat(self):
        self.assertEqual(self.issue()["status"],"ISSUED")
        digest=hashlib.sha256(json.dumps([self.campaign,self.subject],separators=(",",":")).encode()).hexdigest()
        grant=self.db.rows["PROMO_GRANT#"+digest]
        self.assertEqual(grant["status"],S("APPROVED"))
        self.assertEqual(grant["promotionRevision"],S("r1"))
        self.assertEqual(self.db.rows[self.key]["status"],S("ISSUED"))
        with self.assertRaises(ValueError): self.issue()
        self.assertEqual(len(self.db.transactions),1)

    def test_existing_grant_cannot_be_overwritten(self):
        digest=hashlib.sha256(json.dumps([self.campaign,self.subject],separators=(",",":")).encode()).hexdigest()
        key="PROMO_GRANT#"+digest
        self.db.rows[key]={"status":S("CLAIMED")}
        with self.assertRaises(RuntimeError): self.issue()
        self.assertEqual(self.db.rows[key],{"status":S("CLAIMED")})
        self.assertEqual(self.db.rows[self.key]["status"],S("APPROVED"))

    def test_changed_policy_or_purchase_stage_rejected(self):
        self.policy["retail_promotions"]["campaigns"]["WELCOME10"]["revision"]="r2"
        with self.assertRaises(ValueError): self.issue()
        self.policy["retail_promotions"]["campaigns"]["WELCOME10"]["revision"]="r1"
        self.api.account_purchase_stage.return_value="one_paid_order"
        with self.assertRaises(ValueError): self.issue()
        self.assertFalse(self.db.transactions)


if __name__=="__main__":
    unittest.main()
