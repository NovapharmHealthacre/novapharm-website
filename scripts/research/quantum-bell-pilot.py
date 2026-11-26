#!/usr/bin/env python3
"""Optional offline Cirq Bell experiment. Never imports or contacts cloud services.
Installation is NOT automated; an approved local, version-pinned environment is required.
Prints an unverified research receipt, not a signed scientific/production attestation.
"""
import argparse
import hashlib
import json
from pathlib import Path
import sys

def main():
    parser = argparse.ArgumentParser(description="Local two-qubit Bell circuit research (requires a reviewed Cirq installation)")
    parser.add_argument("--shots", type=int, default=512)
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    if not 1 <= args.shots <= 10000 or not 0 <= args.seed <= 2147483647:
        parser.error("shots must be 1..10000 and seed 0..2147483647")
    try:
        import cirq
    except ImportError:
        print("Cirq unavailable; no experiment executed. Install only into a separately reviewed offline research environment.", file=sys.stderr)
        return 2
    q0, q1 = cirq.LineQubit.range(2)
    circuit = cirq.Circuit(cirq.H(q0), cirq.CNOT(q0, q1), cirq.measure(q0, q1, key="out"))
    hist = cirq.Simulator(seed=args.seed).run(circuit, repetitions=args.shots).histogram(key="out")
    counts = {format(i, "02b"): int(hist.get(i, 0)) for i in range(4)}
    if counts["01"] or counts["10"] or sum(counts.values()) != args.shots:
        raise RuntimeError("Ideal Bell simulation violated its required invariant")
    inputs = json.dumps({"circuit": "bell-h-cnot-measure", "seed": args.seed, "shots": args.shots}, sort_keys=True).encode()
    digest = hashlib.sha256(inputs).hexdigest()
    source_digest = hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
    receipt = {
        "schemaVersion": "npi.quantum-research.v1",
        "experimentId": "bell-" + digest[:16],
        "method": "bell-sampling",
        "engine": "cirq-local-simulator",
        "qubits": 2,
        "shots": args.shots,
        "seed": args.seed,
        "noiseModel": "ideal",
        "counts": counts,
        "inputSha256": digest,
        "codeSha256": source_digest,
        "calibrationId": None,
        "simulatedOnly": True,
        "hardwareMeasured": False,
        "independentlyVerified": False,
        "dataRightsApproved": False,
        "productionApproved": False,
        "customerVisible": False,
        "clinicalUsePermitted": False
    }
    print(json.dumps(receipt, sort_keys=True, separators=(",", ":")))
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
