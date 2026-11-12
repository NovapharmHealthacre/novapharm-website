"""Split checksum-verified NHSBSA EPD source ZIP for bounded Drive handoff.

Chunks are byte-exact, deterministic, and must be reassembled in manifest order.
No raw CSV extraction, medicine rights grant or publication.
"""
import hashlib
import json
import pathlib
import sys

CHUNK_BYTES=80*1024*1024
EXPECTED_RAW_SHA="1a3ee72477c8e999cabd3284544bf370f78eb3045529191c0062bf74c9a1017b"
EXPECTED_CSV_BYTES=7432815985
MAX_ARCHIVE_BYTES=650000000

def chunk_archive(source:pathlib.Path,source_receipt:pathlib.Path,destination:pathlib.Path):
    receipt=json.loads(source_receipt.read_text("utf-8"))
    if receipt.get("archive_contents_match_publisher_csv") is not True or \
       receipt.get("decompressed_csv_sha256")!=EXPECTED_RAW_SHA or \
       receipt.get("decompressed_csv_bytes")!=EXPECTED_CSV_BYTES or \
       receipt.get("customer_publish_approved") is not False:
        raise ValueError("archive must have a complete verified publisher CSV receipt")
    size=source.stat().st_size
    if not 0<size<=MAX_ARCHIVE_BYTES or receipt.get("archive_bytes")!=size:
        raise ValueError("archive exceeds private transfer cap")
    h=hashlib.sha256()
    destination.mkdir(parents=True,exist_ok=False)
    parts=[]
    with source.open("rb") as fp:
        i=0
        while True:
            remaining_total = size - i * CHUNK_BYTES
            if remaining_total <= 0:
                break
            first=fp.read(min(CHUNK_BYTES,remaining_total))
            if not first:break
            filename=f"epd_202608_verified_archive_part_{i:02d}.bin"
            digest=hashlib.sha256()
            length=0
            path=destination/filename
            with path.open("xb") as out:
                piece=first
                while piece:
                    out.write(piece)
                    h.update(piece)
                    digest.update(piece)
                    length+=len(piece)
                    remaining=CHUNK_BYTES-length
                    if remaining<=0:break
                    piece=fp.read(min(4*1024*1024,remaining))
            parts.append({"order":i,"filename":filename,"bytes":length,
                          "sha256":digest.hexdigest()})
            i+=1
    if h.hexdigest()!=receipt.get("archive_sha256") or \
       sum(p["bytes"] for p in parts)!=size or len(parts)!=8:
        raise ValueError("archive parts fail byte-for-byte checksum reconciliation")
    manifest={
      "source_id":"nhsbsa_english_prescribing","resource":"EPD_SNOMED_202608",
      "source_archive_sha256":h.hexdigest(),"source_archive_bytes":size,
      "publisher_csv_sha256":EXPECTED_RAW_SHA,
      "publisher_csv_bytes":EXPECTED_CSV_BYTES,
      "parts":parts,
      "transfer_status":"private_archive_parts_verified_not_accepted",
      "reassembly_instruction":"Extract every GitHub artifact, concatenate each .bin in manifest order, verify SHA-256 of joined ZIP, then verify decompressed publisher CSV.",
      "customer_publish_approved":False,"accepted_observations":0,
      "rights_grants_created":0,"production_promoted":False
    }
    (destination/"source-reassembly-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
    return manifest

if __name__=="__main__":
    if len(sys.argv)!=4:raise SystemExit("usage: split_verified_epd_archive.py ARCHIVE VERIFIED_RECEIPT PARTS_DIRECTORY")
    m=chunk_archive(pathlib.Path(sys.argv[1]),pathlib.Path(sys.argv[2]),pathlib.Path(sys.argv[3]))
    print(json.dumps({"status":m["transfer_status"],"parts":len(m["parts"]),
        "archive_bytes":m["source_archive_bytes"],"sha256":m["source_archive_sha256"],
        "customer_publish_approved":False}))
