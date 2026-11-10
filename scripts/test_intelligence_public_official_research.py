import importlib.util
import json
import urllib.parse
import unittest

spec=importlib.util.spec_from_file_location("intelligence_public_official_research","deployment/aws/intelligence_public_official_research.py")
app=importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)
real=app.get_json

def call(source="fda",medicine="apixaban"):
 response=app.handler({"queryStringParameters":{"source":source,"medicine":medicine}},None)
 return response["statusCode"],json.loads(response["body"]),response["headers"]

class OfficialResearchTest(unittest.TestCase):
 def tearDown(self):
  app.get_json=real

 def test_invalid_queries_never_contact_external(self):
  app.get_json=lambda url: (_ for _ in ()).throw(AssertionError("unexpected outbound"))
  for q in [("fda","a"),("fda","x"*81),("unknown","apixaban"),("fda","apixaban\nInjected"),("fda","<script>")]:
   status,body,_=call(*q)
   self.assertEqual(status,400)
   self.assertNotIn("results",body)

 def test_fda_source_is_official_and_result_is_bounded(self):
  urls=[]
  def fake(url):
   urls.append(url)
   return {"results":[{"set_id":"2de4514c-5abd-4afe-9a2b-6d3f9f439898","effective_time":"20260901","openfda":{"brand_name":["Brand X"],"generic_name":["apixaban"]},"unapproved_internal":"should not appear"}]*6}
  app.get_json=fake
  status,body,headers=call()
  self.assertEqual(status,200)
  self.assertEqual(len(body["results"]),3)
  self.assertEqual(body["results"][0]["source"],"FDA openFDA label")
  self.assertNotIn("unapproved_internal",str(body))
  self.assertTrue(body["results"][0]["sourceUrl"].startswith("https://dailymed.nlm.nih.gov/"))
  self.assertEqual(urllib.parse.urlsplit(urls[0]).hostname,"api.fda.gov")
  self.assertEqual(headers["Cache-Control"],"no-store")
  self.assertEqual(body["customerMedicinesTerminal"],False)

 def test_fda_brand_name_fallback(self):
  urls=[]
  def fake(url):
   urls.append(url)
   return {} if len(urls)==1 else {"results":[{"openfda":{"brand_name":["Brand Y"]}}]}
  app.get_json=fake
  status,body,_=call()
  self.assertEqual(status,200)
  self.assertEqual(len(urls),2)
  self.assertIn("brand_name",urllib.parse.parse_qs(urllib.parse.urlsplit(urls[1]).query)["search"][0])
  self.assertEqual(body["results"][0]["title"],"Brand Y")

 def test_trials_registry_identity(self):
  app.get_json=lambda url: {"studies":[{"protocolSection":{"identificationModule":{"nctId":"NCT01234567","briefTitle":"Trial of drug A"},"statusModule":{"overallStatus":"RECRUITING","studyFirstPostDateStruct":{"date":"2026-05-06"}}}},{"protocolSection":{"identificationModule":{"nctId":"INVALID","briefTitle":"Exclude"}}}]}
  status,body,_=call("trials","apixaban")
  self.assertEqual(status,200)
  self.assertEqual(len(body["results"]),1)
  self.assertEqual(body["results"][0]["sourceUrl"],"https://clinicaltrials.gov/study/NCT01234567")
  self.assertEqual(body["results"][0]["subtitle"],"RECRUITING")

 def test_provider_failure_cannot_invent_evidence(self):
  app.get_json=lambda url: (_ for _ in ()).throw(RuntimeError("rate limit"))
  status,body,_=call()
  self.assertEqual(status,503)
  self.assertNotIn("results",body)

if __name__=="__main__":unittest.main()
