"""Retrieve additional exact-GTIN candidates from a verified discovery report.
Supplier pack text is rechecked on each live page; spreadsheet name/pack,
visual identity and publication rights remain independent review gates.
"""
import argparse
import collections
import json
import runpy
import time
from pathlib import Path
from urllib.robotparser import RobotFileParser

def main():
    ap=argparse.ArgumentParser()
    ap.add_argument("--part",type=int,required=True)
    args=ap.parse_args()
    assert 0<=args.part<5
    register=json.loads(Path("docs/retail/connective-batch02-gtins.json").read_text())
    assert register["schema"]=="novapharm-review-gtins-v1" and register["publicationApproved"] is False
    gtins=register["gtins"]
    assert len(gtins)==len(set(gtins))==299
    report=json.loads(Path("review-input/report.json").read_text())
    assert report["checkedPages"]==409 and report["validIdentityCandidates"]==402
    groups=collections.defaultdict(list)
    for row in report["results"]:
        if row.get("status")=="supplier_identity_candidate":
            groups[row["gtin"]].append(row)
    # Require a unique discovery source for every selected GTIN.
    assert all(len(groups[g])==1 for g in gtins)
    wanted=[groups[g][0] for g in gtins[args.part*60:(args.part+1)*60]]
    helper=runpy.run_path("scripts/collect-connective-image-candidates.py")
    collect=helper["collect"]
    original_fetch=helper["fetch"]
    robots=RobotFileParser()
    raw,_=original_fetch("https://www.connectivepharma.com/robots.txt",helper["MAX_PAGE"])
    robots.parse(raw.decode("utf-8",errors="replace").splitlines())
    last=0.0
    def paced_fetch(url,limit):
        nonlocal last
        if not robots.can_fetch("NovaPharm product asset review/1.0",url):
            raise ValueError("supplier robots policy disallows retrieval")
        time.sleep(max(0,0.8-(time.monotonic()-last)))
        last=time.monotonic()
        return original_fetch(url,limit)
    collect.__globals__["fetch"]=paced_fetch
    root=Path("review-output")/f"part-{args.part+1}";root.mkdir(parents=True,exist_ok=True)
    rows=[]
    for row in wanted:
        result=collect(row,root)
        result["supplierName"]=row["name"]
        result["supplierPack"]=row["pack"]
        result["spreadsheetVariantReviewRequired"]=True
        rows.append(result)
    summary={"part":args.part+1,"requested":len(rows),"downloadedProducts":sum(bool(r["assets"]) for r in rows),"downloadedImages":sum(len(r["assets"]) for r in rows),"published":0,"results":rows}
    (root/"report.json").write_text(json.dumps(summary,indent=2)+"\n")
    print(json.dumps({k:v for k,v in summary.items() if k!="results"}))
if __name__=="__main__":main()
