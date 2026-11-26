#!/usr/bin/env python3
"""Materialise exact-GTIN-linked owner-authorised original photos; no checkout approvals."""
import hashlib,json,re,argparse
from pathlib import Path
from PIL import Image,ImageOps
def materialize(archives,source,root):
    data=json.loads(source.read_text())["products"]
    by_gtin={p["ean"]:p for p in data}
    if len(by_gtin)!=395 or len(data)!=395:raise ValueError("Expected 395 GTINs")
    reports=list(sorted(archives.rglob("report.json")))
    if len(reports)!=7:raise ValueError("Seven original image archives required")
    candidates={k:[] for k in by_gtin}
    count=0
    for path in reports:
        doc=json.loads(path.read_text())
        if doc.get("published")!=0:raise ValueError("Only review-only archives may be used")
        for row in doc.get("results",[]):
            gtin=row.get("gtin")
            if gtin not in candidates:continue
            for a in row.get("assets",[]):
                loc=a.get("path","")
                if not re.fullmatch(r"\d{13}/(?:[1-8]|candidate)\.(?:jpg|jpeg|png|webp)",loc):
                    raise ValueError("Invalid image candidate path")
                original=(path.parent/loc).resolve()
                if not original.is_relative_to(path.parent.resolve()) or not original.is_file():
                    raise ValueError("Escaped/missing original")
                raw=original.read_bytes()
                if len(raw)!=a["bytes"] or hashlib.sha256(raw).hexdigest()!=a["sha256"]:
                    raise ValueError("Original image hash mismatch")
                candidates[gtin].append((original,a,path))
                count+=1
    if count!=802 or any(not v for v in candidates.values()):
        raise ValueError("802 originals and 395 matching GTINs required")
    result=[]
    for gtin,product in sorted(by_gtin.items()):
        def rank(entry):
            file,a,report=entry
            image_url=a.get("sourceImage") or ""
            return (0 if product.get("supplierImageUrl") and image_url==product["supplierImageUrl"] else
                1 if "vitabiotics" in str(report).lower() and product["brand"].lower()=="vitabiotics" else 2,
                0 if "front" in (image_url+file.name).lower() else 1, str(report),file.name)
        file,a,report=sorted(candidates[gtin],key=rank)[0]
        with Image.open(file) as img:
            image=ImageOps.exif_transpose(img)
            dims=image.size
            if min(dims)<160:raise ValueError("Source photograph too small: "+gtin)
            im=image.convert("RGBA")
            im.thumbnail((790,790),Image.Resampling.LANCZOS)
            surface=Image.new("RGBA",(800,800),(255,255,255,255))
            surface.alpha_composite(im,((800-im.width)//2,(800-im.height)//2))
            target=root/"assets/media/products/connective"/gtin/"front-800.webp"
            target.parent.mkdir(parents=True,exist_ok=True)
            surface.convert("RGB").save(target,"WEBP",quality=88,method=2)
            encoded=target.read_bytes()
            if encoded[:4]!=b"RIFF" or encoded[8:12]!=b"WEBP":
                raise ValueError("Invalid WebP conversion")
            result.append({"gtin":gtin,"localImage":"/assets/media/products/connective/"+gtin+"/front-800.webp",
                "sha256":hashlib.sha256(encoded).hexdigest(),"originalSha256":a["sha256"],
                "originalSource":a.get("sourceImage"),"sourcePage":product["supplierProductUrl"],
                "originalDimensions":dims,"archivedAlternativeCount":len(candidates[gtin]),
                "ownerPhotoUsageAuthorised":True,"visuallyCurrentPackVerified":False,
                "mandatoryLabelConfirmed":False,"paidCheckoutApproved":False})
    assert len(result)==395
    audit=root/"docs/retail/connective-395-owner-photo-candidates.json"
    audit.parent.mkdir(parents=True,exist_ok=True)
    audit.write_text(json.dumps({"schema":"novapharm-connective-owner-photos-v1",
        "originalImagesVerified":802,"localImagesPrepared":395,"paymentOffersAdmitted":0,
        "status":"PHOTO_CANDIDATES_PENDING_PACK_LABEL_REVIEW","products":result},indent=2)+"\n")
    print("Prepared 395 genuine WebP candidates from 802 checksum-verified archived images.")
if __name__=="__main__":
    p=argparse.ArgumentParser()
    p.add_argument("--archives",type=Path,default=Path("review"))
    p.add_argument("--source",type=Path,default=Path("src/content/connective-source-references.json"))
    p.add_argument("--root",type=Path,default=Path("."))
    args=p.parse_args();materialize(args.archives,args.source,args.root)
