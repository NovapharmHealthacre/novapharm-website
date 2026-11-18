#!/usr/bin/env python3
"""Offline CPU research demonstration; generated binary data only. Not clinical or production AI."""
import argparse
import copy
import hashlib
import json
import math
import random
from datetime import datetime, timezone

import torch
from torch import nn
from torch.nn import functional as F

SEED = 117
VOCAB = 16
DIM = 16
HEADS = 2
SEQ = 6


def dataset(samples: int, offset: int):
    gen = torch.Generator().manual_seed(SEED + offset)
    y = torch.randint(0, 2, (samples,), generator=gen)
    x = torch.randint(3, VOCAB, (samples, SEQ), generator=gen)
    x[:, 0] = 0  # CLS token
    at = torch.randint(1, SEQ, (samples,), generator=gen)
    x[torch.arange(samples), at] = y + 1
    return x, y


class TinyAttentionClassifier(nn.Module):
    def __init__(self):
        super().__init__()
        self.embedding = nn.Embedding(VOCAB, DIM)
        self.position = nn.Parameter(torch.zeros(SEQ, DIM))
        self.qkv = nn.Linear(DIM, 3 * DIM, bias=False)
        self.proj = nn.Linear(DIM, DIM, bias=False)
        self.norm = nn.LayerNorm(DIM)
        self.ff = nn.Sequential(nn.Linear(DIM, 24), nn.ReLU(), nn.Linear(24, DIM))
        self.final_norm = nn.LayerNorm(DIM)
        self.output = nn.Linear(DIM, 2)

    def forward(self, tokens, head_mask=None, head_mean=None, return_heads=False):
        b, length = tokens.shape
        emb = self.embedding(tokens) + self.position[:length]
        qkv = self.qkv(emb).reshape(b, length, 3, HEADS, DIM // HEADS)
        q, k, v = qkv.permute(2, 0, 3, 1, 4).unbind(0)
        score = q @ k.transpose(-1, -2) / math.sqrt(DIM // HEADS)
        contexts = torch.softmax(score, dim=-1) @ v
        # Each head is a true separate attention computation, [batch, heads, tokens, head_dim].
        if head_mask is not None:
            mask = torch.as_tensor(head_mask, dtype=contexts.dtype, device=contexts.device).view(1, HEADS, 1, 1)
            if head_mean is None:
                contexts = contexts * mask
            else:
                # Only mean ablate the CLS readout; all other token positions
                # are unchanged, since classification reads CLS only.
                replacement = torch.as_tensor(head_mean, dtype=contexts.dtype, device=contexts.device).view(1, HEADS, 1, DIM // HEADS)
                contexts = contexts * mask + replacement * (1 - mask)
        readout = self.proj(contexts.transpose(1, 2).reshape(b, length, DIM))
        hidden = self.norm(emb + readout)
        hidden = self.final_norm(hidden + self.ff(hidden))
        logits = self.output(hidden[:, 0])
        return (logits, contexts[:, :, 0, :]) if return_heads else logits


def metric(model, data, head_mask=None, head_mean=None):
    model.eval()
    with torch.no_grad():
        x, y = data
        logits = model(x, head_mask=head_mask, head_mean=head_mean)
        return float(F.cross_entropy(logits, y)), float((logits.argmax(-1) == y).float().mean())


def activation_mean(model, calibration):
    model.eval()
    with torch.no_grad():
        _, heads = model(calibration[0], return_heads=True)
        return heads.mean(dim=0)


def magnitude_prune(model, fraction):
    # Only attention projection matrices are pruned; other layers are untouched.
    # This is magnitude pruning, not OpenAI's L0-trained circuit extraction.
    with torch.no_grad():
        for layer in (model.qkv, model.proj):
            vals = layer.weight.abs().flatten()
            threshold = torch.quantile(vals, fraction)
            layer.weight[abs(layer.weight) <= threshold] = 0


def weight_digest(model):
    hash_ = hashlib.sha256()
    for name, value in sorted(model.state_dict().items()):
        hash_.update(name.encode())
        hash_.update(str(tuple(value.shape)).encode())
        hash_.update(value.detach().cpu().contiguous().numpy().tobytes())
    return hash_.hexdigest()


def run(steps=220, train_size=512, holdout_size=256, prune_fraction=0.20):
    assert 30 <= steps <= 1000
    assert 128 <= train_size <= 4096
    assert 64 <= holdout_size <= 4096
    assert 0 <= prune_fraction <= 0.5
    torch.set_num_threads(1)
    torch.manual_seed(SEED)
    random.seed(SEED)
    train = dataset(train_size, 0)
    calibration = dataset(128, 900)
    holdout = dataset(holdout_size, 1800)
    model = TinyAttentionClassifier()
    optimizer = torch.optim.AdamW(model.parameters(), lr=0.012, weight_decay=0.001)
    model.train()
    for _ in range(steps):
        idx = torch.randint(0, train_size, (64,))
        x, y = train[0][idx], train[1][idx]
        logits = model(x)
        loss = F.cross_entropy(logits, y)
        optimizer.zero_grad(set_to_none=True)
        loss.backward()
        optimizer.step()
    base_loss, base_accuracy = metric(model, holdout)
    pruned = copy.deepcopy(model)
    magnitude_prune(pruned, prune_fraction)
    pruned_loss, pruned_accuracy = metric(pruned, holdout)
    mean = activation_mean(pruned, calibration)
    head_drop_losses = []
    for h in range(HEADS):
        mask = [1.0] * HEADS
        mask[h] = 0
        head_drop_losses.append(metric(pruned, holdout, head_mask=mask, head_mean=mean)[0])
    # Retain the head whose mean ablation most increases the loss.
    kept = int(torch.tensor(head_drop_losses).argmax().item())
    circuit_mask = [0.0] * HEADS
    circuit_mask[kept] = 1.0
    # Head 1/2 are the two inspectable attention components. Remove others,
    # then mean-ablate the retained head to measure its causal necessity.
    circuit_loss, circuit_accuracy = metric(pruned, holdout, head_mask=circuit_mask)
    ablated_loss, ablated_accuracy = metric(pruned, holdout, head_mask=[0., 0.], head_mean=mean)
    params = int(sum(p.numel() for p in pruned.parameters()))
    nonzero = int(sum(torch.count_nonzero(p).item() for p in pruned.parameters()))
    digest = hashlib.sha256()
    for part in (train, calibration, holdout):
        for tensor in part:
            digest.update(tensor.cpu().numpy().tobytes())
    weights_sha256 = weight_digest(pruned)
    dataset_sha256 = digest.hexdigest()
    head_width = DIM // HEADS
    selected_head = f"head-{kept}"
    qkv_magnitude = float(pruned.qkv.weight.detach().reshape(3, HEADS, head_width, DIM)[:, kept].abs().mean())
    projection_magnitude = float(pruned.proj.weight.detach()[:, kept * head_width: (kept + 1) * head_width].abs().mean())
    assert qkv_magnitude > 0 and projection_magnitude > 0
    artifact = {
        "schemaVersion": "npi.sparse-circuit.v1",
        "model": {"identifier": "toy-trained-attention", "revision": "synthetic-v1",
                  "weightsSha256": weights_sha256, "access": "weights-and-activations"},
        "task": {"identifier": "synthetic-keyword-class", "datasetSha256": dataset_sha256},
        "circuit": {"nodes": [
            {"id": "synthetic-token", "kind": "embedding-channel"},
            {"id": selected_head, "kind": "attention-channel"},
            {"id": "cls-readout", "kind": "residual-write"}
        ], "edges": [
            {"from": "synthetic-token", "to": selected_head, "weight": qkv_magnitude},
            {"from": selected_head, "to": "cls-readout", "weight": projection_magnitude}
        ]},
        "evaluation": {"baselineLoss": base_loss, "circuitLoss": circuit_loss,
                       "ablatedLoss": ablated_loss, "sampleCount": holdout_size,
                       "holdout": True, "ablation": "mean"},
        "provenance": {"runId": f"toy-transformer-seed-{SEED}",
                       "implementationRevision": "offline-pytorch-v1",
                       "evaluatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")}
    }
    result = {
        "contract": "novapharm.intelligence.offline-sparse-transformer-experiment.v1",
        "classification": "synthetic-local-research-only",
        "model": {"kind": "trained-1-block-2-head-attention", "seed": SEED, "trainSteps": steps,
                  "parameters": params, "nonzeroParameters": nonzero, "weightsSha256": weights_sha256,
                  "pruning": "attention-weight-magnitude", "pruneFraction": prune_fraction},
        "data": {"kind": "generated-non-pharmaceutical", "train": train_size,
                 "calibration": len(calibration[1]), "holdout": holdout_size, "sha256": dataset_sha256},
        "evaluation": {"baselineLoss": base_loss, "baselineAccuracy": base_accuracy,
                       "prunedLoss": pruned_loss, "prunedAccuracy": pruned_accuracy,
                       "isolatedCircuitLoss": circuit_loss, "isolatedCircuitAccuracy": circuit_accuracy,
                       "ablatedLoss": ablated_loss, "ablatedAccuracy": ablated_accuracy,
                       "headAblatedLosses": head_drop_losses, "keptHeadIndex": kept},
        "candidateArtifact": artifact,
        "assurance": {"independentReproduction": False, "rightsApproved": False,
                      "mechanisticExplanationVerified": False, "productionEligible": False,
                      "clinicalUsePermitted": False},
        "limits": "Not a full weight-sparse transformer, causal circuit ground truth, pharma dataset, model safety assessment or published paper replication."
    }
    assert all(math.isfinite(x) for x in [base_loss,pruned_loss,circuit_loss,ablated_loss,*head_drop_losses])
    assert params > nonzero > 0
    assert artifact["evaluation"]["ablatedLoss"] > artifact["evaluation"]["circuitLoss"]
    assert all(v is False for v in result["assurance"].values())
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--steps", type=int, default=220)
    parser.add_argument("--train-size", type=int, default=512)
    parser.add_argument("--holdout-size", type=int, default=256)
    parser.add_argument("--prune-fraction", type=float, default=0.20)
    opts = parser.parse_args()
    print(json.dumps(run(opts.steps, opts.train_size, opts.holdout_size, opts.prune_fraction), indent=2, sort_keys=True))
