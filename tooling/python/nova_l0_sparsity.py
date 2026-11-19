"""Research-only PyTorch implementation of hard-concrete L0 feature gates.

Based on Louizos, Welling & Kingma, ICLR 2018 (arXiv:1712.01312).
This file does not access files, datasets, networks, cloud services or production.
No model is trained, approved, calibrated or deployed by importing this module.
"""
from __future__ import annotations

import math
import re
from typing import Sequence

import torch
from torch import Tensor, nn


class HardConcreteFeatureGates(nn.Module):
    """One learnable gate per entire input feature, enabling structured feature sparsity."""

    def __init__(
        self,
        feature_count: int,
        *,
        temperature: float = 2.0 / 3.0,
        gamma: float = -0.1,
        zeta: float = 1.1,
        initial_log_alpha: float = 2.0,
    ) -> None:
        super().__init__()
        if not isinstance(feature_count, int) or not 1 <= feature_count <= 4096:
            raise ValueError("Feature count must be between 1 and 4096.")
        if not all(math.isfinite(v) for v in (temperature, gamma, zeta, initial_log_alpha)):
            raise ValueError("Gate parameters must be finite.")
        if temperature <= 0 or gamma >= 0 or zeta <= 1:
            raise ValueError("Hard-concrete requires temperature > 0, gamma < 0 and zeta > 1.")
        self.temperature = temperature
        self.gamma = gamma
        self.zeta = zeta
        self.log_alpha = nn.Parameter(torch.full((feature_count,), float(initial_log_alpha), dtype=torch.float32))

    def forward(self) -> Tensor:
        if self.training:
            # Clamping avoids log(0); the noise remains independent of parameters.
            uniform = torch.rand_like(self.log_alpha).clamp(1e-6, 1 - 1e-6)
            noise = torch.log(uniform) - torch.log1p(-uniform)
            concrete = torch.sigmoid((noise + self.log_alpha) / self.temperature)
        else:
            concrete = torch.sigmoid(self.log_alpha)
        return (concrete * (self.zeta - self.gamma) + self.gamma).clamp(0, 1)

    def expected_active_features(self) -> Tensor:
        # Equation 12, expected L0: sum_j P(z_j > 0).
        offset = self.temperature * math.log(-self.gamma / self.zeta)
        return torch.sigmoid(self.log_alpha - offset).sum()


class NovaL0SparseLinearRegressor(nn.Module):
    """Small research-only example; not a medicine-demand production forecaster."""

    def __init__(self, feature_count: int, **gate_kwargs: float) -> None:
        super().__init__()
        self.gates = HardConcreteFeatureGates(feature_count, **gate_kwargs)
        self.weights = nn.Parameter(torch.zeros(feature_count))
        self.bias = nn.Parameter(torch.zeros(()))

    def forward(self, features: Tensor) -> Tensor:
        if features.ndim != 2 or features.shape[1] != self.weights.numel():
            raise ValueError("Features must be a 2D tensor with the approved feature dimension.")
        if not bool(torch.isfinite(features).all()):
            raise ValueError("Feature values must be finite.")
        return (features * self.gates()).matmul(self.weights) + self.bias

    def regularized_mse(self, features: Tensor, labels: Tensor, l0_lambda: float) -> Tensor:
        if not math.isfinite(l0_lambda) or l0_lambda < 0:
            raise ValueError("L0 regularization strength must be finite and nonnegative.")
        predictions = self(features)
        if labels.shape != predictions.shape or not bool(torch.isfinite(labels).all()):
            raise ValueError("Labels must match predictions and be finite.")
        return torch.mean((predictions - labels).square()) + l0_lambda * self.gates.expected_active_features()

    @torch.no_grad()
    def export_research_candidate(self, feature_names: Sequence[str]) -> dict:
        """No validation or publication right is granted by this export."""
        if self.training:
            raise ValueError("Call eval() before preparing deterministic export.")
        if len(feature_names) != self.weights.numel() or len(set(feature_names)) != len(feature_names):
            raise ValueError("Feature schema does not match trained model.")
        if any(not isinstance(name, str) or not re.fullmatch(r"[a-z][a-z0-9_]{0,63}", name) for name in feature_names):
            raise ValueError("Invalid feature name.")
        if (not bool(torch.isfinite(self.weights).all()) or not bool(torch.isfinite(self.bias))
                or not bool(torch.isfinite(self.gates.log_alpha).all())):
            raise ValueError("Model parameters must be finite.")
        gate_values = self.gates()
        coefficients = (self.weights * gate_values).cpu().tolist()
        return {
            "format": "nova-l0-sparse-linear-candidate-v1",
            "releaseStatus": "research-only",
            "productionApproved": False,
            "customerVisible": False,
            "featureNames": list(feature_names),
            "coefficients": [0.0 if v == 0 else v for v in coefficients],
            "bias": float(self.bias.item()),
            "nonZeroCount": sum(v != 0 for v in coefficients),
        }
