"""Public official-source lookup for the NovaPharm Intelligence research entry.

This is neither the authenticated Medicines Terminal nor medical advice.
Only a bounded search term is relayed to FDA or ClinicalTrials.gov. No patient,
customer, or tenant information is accepted or retained by this function.
"""
import datetime
import json
import re
import urllib.error
import urllib.parse
import urllib.request

TERM = re.compile(r"^[A-Za-z0-9][A-Za-z0-9 .-]{1,79}$")
SET_ID = re.compile(r"^[0-9a-fA-F-]{36}$")
NCT = re.compile(r"^NCT[0-9]{8}$")
OFFICIAL = {"fda", "trials"}

class NoRedirect(urllib.request.HTTPRedirectHandler):
 def redirect_request(self, request, fp, code, msg, headers, newurl):
  return None

def respond(status, body):
 return {"statusCode":status,"headers":{"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-Robots-Tag":"noindex"},"body":json.dumps(body,separators=(",",":"))}

def get_json(url):
 parsed=urllib.parse.urlsplit(url)
 if parsed.scheme!="https" or parsed.hostname not in {"api.fda.gov","clinicaltrials.gov"}:
  raise ValueError("Unapproved source")
 req=urllib.request.Request(url,headers={"Accept":"application/json","User-Agent":"NovaPharmIntelligence-OfficialPublicResearch/1.0"})
 opener=urllib.request.build_opener(NoRedirect())
 try:
  with opener.open(req,timeout=7) as reply:
   if reply.status!=200: raise RuntimeError("upstream_status")
   raw=reply.read(262145)
 except urllib.error.HTTPError as error:
  if error.code==404: return {}
  raise RuntimeError("official_source_unavailable") from None
 if len(raw)>262144: raise RuntimeError("source_payload_too_large")
 return json.loads(raw.decode("utf-8"))

def fda(term):
 q=urllib.parse.urlencode({"search":'openfda.generic_name:"'+term+'"',"limit":5})
 data=get_json("https://api.fda.gov/drug/label.json?"+q)
 if not data.get("results"):
  q=urllib.parse.urlencode({"search":'openfda.brand_name:"'+term+'"',"limit":5})
  data=get_json("https://api.fda.gov/drug/label.json?"+q)
 out=[]
 for item in data.get("results",[])[:5]:
  names=item.get("openfda") or {}
  generic=(names.get("generic_name") or [""])[0]
  brand=(names.get("brand_name") or [""])[0]
  title=(brand or generic or "FDA drug-label record")[:120]
  setid=str(item.get("set_id") or "")
  url="https://dailymed.nlm.nih.gov/dailymed/" if not SET_ID.fullmatch(setid) else "https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid="+setid
  out.append({"title":title,"subtitle":generic[:140],"recordId":setid[:60],"updated":str(item.get("effective_time") or "")[:8],"source":"FDA openFDA label","sourceUrl":url})
 return out

def trials(term):
 q=urllib.parse.urlencode({"query.term":term,"pageSize":5,"format":"json"})
 data=get_json("https://clinicaltrials.gov/api/v2/studies?"+q)
 out=[]
 for item in data.get("studies",[])[:5]:
  section=item.get("protocolSection") or {}
  identity=section.get("identificationModule") or {}
  status=section.get("statusModule") or {}
  nct=str(identity.get("nctId") or "")
  if not NCT.fullmatch(nct): continue
  out.append({"title":str(identity.get("briefTitle") or "Registered study")[:150],"subtitle":str(status.get("overallStatus") or "Status not specified")[:80],"recordId":nct,"updated":str(status.get("studyFirstPostDateStruct",{}).get("date") or "")[:10],"source":"ClinicalTrials.gov","sourceUrl":"https://clinicaltrials.gov/study/"+nct})
 return out

def handler(event, context):
 query=event.get("queryStringParameters") or {}
 if not isinstance(query,dict):return respond(400,{"error":"invalid_query"})
 term=str(query.get("medicine") or "").strip()
 source=str(query.get("source") or "").strip()
 if source not in OFFICIAL or not TERM.fullmatch(term) or len(term)<2:
  return respond(400,{"error":"invalid_medicine_or_source"})
 try:
  records=fda(term) if source=="fda" else trials(term)
 except Exception:
  return respond(503,{"error":"official_source_temporarily_unavailable","source":source})
 return respond(200,{"source":source,"publisher":"U.S. Food and Drug Administration" if source=="fda" else "ClinicalTrials.gov","medicine":term,"results":records,"observedOnly":True,"licenceAndProvenanceMustBeReviewed":True,"customerMedicinesTerminal":False,"medicalAdvice":False,"retrievedAt":datetime.datetime.now(datetime.timezone.utc).isoformat()})
