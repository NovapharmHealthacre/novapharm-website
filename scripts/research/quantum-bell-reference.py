#!/usr/bin/env python3
"""Independent two-qubit Bell circuit state-vector and finite-shot baseline.
Standard-library only, offline and bounded; NOT a quantum hardware experiment.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path
import random

MAX_SHOTS = 10000

def bell_state():
    amplitudes = [complex(1), 0j, 0j, 0j]  # |00>, |01>, |10>, |11>
    s = 1 / math.sqrt(2)
    # Hadamard on qubit 0 (most significant bit): explicit linear operation.
    for left, right in ((0, 2), (1, 3)):
        a, b = amplitudes[left], amplitudes[right]
        amplitudes[left] = (a + b) * s
        amplitudes[right] = (a - b) * s
    # Controlled-NOT (control q0, target q1): swap |10> and |11>.
    amplitudes[2], amplitudes[3] = amplitudes[3], amplitudes[2]
    probs = [abs(a) ** 2 for a in amplitudes]
    if not math.isclose(sum(probs), 1, abs_tol=1e-12):
        raise RuntimeError('State norm is invalid')
    if abs(probs[1]) > 1e-14 or abs(probs[2]) > 1e-14:
        raise RuntimeError('Bell ideal circuit cannot produce 01 or 10')
    return probs

def wilson_interval(successes, total, z=1.96):
    if not isinstance(total, int) or total < 1 or total > MAX_SHOTS:
        raise ValueError('Shots outside bounds')
    if not isinstance(successes, int) or not 0 <= successes <= total:
        raise ValueError('Invalid successes')
    p = successes / total
    z2 = z*z
    center = (p + z2/(2*total))/(1+z2/total)
    width = z*math.sqrt(p*(1-p)/total + z2/(4*total*total))/(1+z2/total)
    return [max(0, center-width), min(1, center+width)]

def simulate(shots=512, seed=42):
    if type(shots) is not int or not 1 <= shots <= MAX_SHOTS:
        raise ValueError('Shots must be an integer in 1..10000')
    if type(seed) is not int or not 0 <= seed <= 2147483647:
        raise ValueError('Seed must be a nonnegative 31-bit integer')
    probabilities = bell_state()
    rng = random.Random(seed)
    outcomes = rng.choices(range(4), weights=probabilities, k=shots)
    counts = {format(i, '02b'): outcomes.count(i) for i in range(4)}
    if sum(counts.values()) != shots or counts['01'] or counts['10']:
        raise RuntimeError('Unexpected ideal measurement outcome')
    inputs = json.dumps({'algorithm': 'H(q0), CNOT(q0,q1), measure',
                         'seed': seed, 'shots': shots}, sort_keys=True).encode()
    return {'schemaVersion': 'npi.quantum-bell-reference.v1',
            'mode': 'independent-classical-state-vector-baseline',
            'experimentId': 'bellref-' + hashlib.sha256(inputs).hexdigest()[:16],
            'simulatedOnly': True, 'hardwareMeasured': False,
            'independentlyScientificallyReplicated': False,
            'productionApproved': False, 'clinicalUsePermitted': False,
            'seed': seed, 'shots': shots,
            'exactProbabilities': {format(i, '02b'): p for i, p in enumerate(probabilities)},
            'counts': counts,
            'observed00Frequency': counts['00']/shots,
            'observed00Wilson95': wilson_interval(counts['00'], shots),
            'sourceSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--shots', type=int, default=512)
    parser.add_argument('--seed', type=int, default=42)
    args = parser.parse_args()
    try:
        print(json.dumps(simulate(args.shots, args.seed), sort_keys=True, separators=(',',':')))
    except ValueError as exc:
        parser.error(str(exc))

if __name__ == '__main__':
    main()
