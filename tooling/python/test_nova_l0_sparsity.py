"""Synthetic numerical invariants only: not model accuracy, rights or deploy acceptance."""
import math
import unittest

import torch

from nova_l0_sparsity import HardConcreteFeatureGates, NovaL0SparseLinearRegressor


class HardConcreteResearchTests(unittest.TestCase):
    def test_analytic_expected_l0_and_deterministic_gate(self):
        gates = HardConcreteFeatureGates(2, initial_log_alpha=0)
        expected = 2 / (1 + math.exp(-(2 / 3) * math.log(11)))
        self.assertAlmostEqual(gates.expected_active_features().item(), expected, places=6)
        gates.eval()
        self.assertTrue(torch.allclose(gates(), torch.tensor([0.5, 0.5])))

    def test_extreme_gates_are_exact_zero_or_one(self):
        gates = HardConcreteFeatureGates(2)
        with torch.no_grad():
            gates.log_alpha.copy_(torch.tensor([-100.0, 100.0]))
        gates.eval()
        self.assertEqual(gates().tolist(), [0.0, 1.0])

    def test_gradient_flows_through_gate_and_weight(self):
        torch.manual_seed(7)
        model = NovaL0SparseLinearRegressor(2, initial_log_alpha=0)
        with torch.no_grad():
            model.weights.fill_(1)
        features = torch.tensor([[1.0, 2.0], [2.0, 0.0]])
        labels = torch.tensor([3.0, 2.0])
        loss = model.regularized_mse(features, labels, l0_lambda=0.01)
        loss.backward()
        self.assertTrue(torch.isfinite(model.weights.grad).all())
        self.assertTrue(torch.isfinite(model.gates.log_alpha.grad).all())

    def test_fail_closed_inference_export_and_schema(self):
        model = NovaL0SparseLinearRegressor(2)
        with self.assertRaisesRegex(ValueError, "eval"):
            model.export_research_candidate(["demand", "stock"])
        with torch.no_grad():
            model.weights.copy_(torch.tensor([2.0, 999.0]))
            model.bias.fill_(3)
            model.gates.log_alpha.copy_(torch.tensor([100.0, -100.0]))
        model.eval()
        artifact = model.export_research_candidate(["demand", "stock"])
        self.assertEqual(artifact["nonZeroCount"], 1)
        self.assertEqual(artifact["coefficients"], [2.0, 0.0])
        self.assertEqual(artifact["productionApproved"], False)
        self.assertEqual(artifact["customerVisible"], False)
        self.assertAlmostEqual(sum(x * w for x, w in zip([5, 7], artifact["coefficients"])) + artifact["bias"], 13)
        with self.assertRaises(ValueError):
            model.export_research_candidate(["stock", "stock"])
        with self.assertRaises(ValueError):
            model.export_research_candidate(["Demand", "stock"])
        with torch.no_grad():
            model.gates.log_alpha[0] = float("nan")
        with self.assertRaisesRegex(ValueError, "finite"):
            model.export_research_candidate(["demand", "stock"])

    def test_invalid_params_and_unapproved_dimensions(self):
        with self.assertRaises(ValueError):
            HardConcreteFeatureGates(0)
        with self.assertRaises(ValueError):
            HardConcreteFeatureGates(2, temperature=0)
        with self.assertRaises(ValueError):
            HardConcreteFeatureGates(2, gamma=0)
        model = NovaL0SparseLinearRegressor(2)
        with self.assertRaises(ValueError):
            model(torch.zeros((3, 3)))
        with self.assertRaises(ValueError):
            model.regularized_mse(torch.zeros((3, 2)), torch.zeros(3), l0_lambda=-1)


if __name__ == "__main__":
    unittest.main()
