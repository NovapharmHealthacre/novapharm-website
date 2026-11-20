#!/usr/bin/env python3
"""Offline Bell readout-noise toy model. NOT quantum device calibration or error correction.

Only a bounded independent classical bit-flip channel is simulated.
No quantum hardware, credentials, patient datasets, or external network calls.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import random

MAX_SHOTS = 10000
MAX_READOUT_ERROR = 0.2


def analytical_probabilities(bit_flip_probability):
    if isinstance(bit_flip_probability, bool) or not isinstance(bit_flip_probability, (int, float)):
        raise ValueError("Expected finite numeric readout error assumption")
    if not math.isfinite(bit_flip_probability) or not 0 <= bit_flip_probability <= MAX_READOUT_ERROR:
        raise ValueError("Readout error assumption outside 0..0.2")
    diagonal = 0.5 * ((1 - bit_flip_probability) ** 2 + bit_flip_probability ** 2)
    off_diagonal = bit_flip_probability * (1 - bit_flip_probability)
    return {"00": diagonal, "01": off_diagonal, "10": off_diagonal, "11": diagonal}


def simulate(shots=512, seed=42, readout_error=0.02):
    if type(shots) is not int or not 1 <= shots <= MAX_SHOTS:
        raise ValueError("Shots outside 1..10000")
    if type(seed) is not int or not 0 <= seed <= 2147483647:
        raise ValueError("Invalid 31-bit seed")
    expected = analytical_probabilities(readout_error)
    rng = random.Random(seed)
    counts = {label: 0 for label in ("00", "01", "10", "11")}
    for _ in range(shots):
        ideal = 0 if rng.random() < 0.5 else 3
        noisy = ideal ^ (2 if rng.random() < readout_error else 0) ^ (1 if rng.random() < readout_error else 0)
        counts[format(noisy, "02b")] += 1
    if sum(counts.values()) != shots:
        raise RuntimeError("Invalid measurement count")
    config = json.dumps({"model": "two-independent-classical-readout-bit-flips", "shots": shots,
                         "seed": seed, "readout_error": readout_error}, sort_keys=True).encode()
    return {
        "schemaVersion": "npi.quantum-synthetic-noise.v1",
        "experimentId": "noise-" + hashlib.sha256(config).hexdigest()[:16],
        "model": "independent-classical-readout-bit-flip",
        "noiseAssumption": readout_error,
        "noiseIsSynthetic": True,
        "hardwareMeasured": False,
        "quantumErrorCorrectionPerformed": False,
        "calibrationVerified": False,
        "independentlyVerified": False,
        "productionApproved": False,
        "clinicalUsePermitted": False,
        "shots": shots,
        "seed": seed,
        "theoreticalProbabilities": expected,
        "counts": counts,
        "observedDisagreementFraction": (counts["01"] + counts["10"]) / shots,
        "expectedDisagreementFraction": 2 * readout_error * (1 - readout_error),
        "sourceSha256": hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--shots", type=int, default=512)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--readout-error", type=float, default=0.02)
    args = parser.parse_args()
    try:
        print(json.dumps(simulate(args.shots, args.seed, args.readout_error), sort_keys=True))
    except ValueError as exc:
        parser.error(str(exc))


if __name__ == "__main__":
    main()
