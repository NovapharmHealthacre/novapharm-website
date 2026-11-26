"""Safety and analytical checks for the first-party offline Bell noise toy model."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import unittest

SCRIPT = Path(__file__).with_name("quantum-noise-reference.py")
spec = importlib.util.spec_from_file_location("quantum_noise_reference", SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class QuantumNoiseTests(unittest.TestCase):
    def test_ideal_no_noise_has_only_equal_bitstrings(self):
        result = module.simulate(512, 42, 0.0)
        self.assertEqual(result["counts"]["01"], 0)
        self.assertEqual(result["counts"]["10"], 0)
        self.assertEqual(result["expectedDisagreementFraction"], 0)
        self.assertFalse(result["hardwareMeasured"])
        self.assertFalse(result["calibrationVerified"])

    def test_analytic_noise_distribution_is_normalized(self):
        probabilities = module.analytical_probabilities(0.1)
        self.assertAlmostEqual(probabilities["00"], 0.41)
        self.assertAlmostEqual(probabilities["11"], 0.41)
        self.assertAlmostEqual(probabilities["01"], 0.09)
        self.assertAlmostEqual(probabilities["10"], 0.09)
        self.assertAlmostEqual(sum(probabilities.values()), 1)

    def test_seeded_histograms_repeat_and_stay_bounded(self):
        first = module.simulate(5000, 5, 0.1)
        second = module.simulate(5000, 5, 0.1)
        self.assertEqual(first["counts"], second["counts"])
        self.assertEqual(first["experimentId"], second["experimentId"])
        self.assertEqual(sum(first["counts"].values()), 5000)
        self.assertLess(abs(first["observedDisagreementFraction"] - 0.18), 0.04)
        self.assertFalse(first["quantumErrorCorrectionPerformed"])
        self.assertFalse(first["productionApproved"])
        self.assertFalse(first["clinicalUsePermitted"])

    def test_invalid_inputs_fail_closed(self):
        for p in (float("nan"), float("inf"), -0.01, 0.21, True, "0.1"):
            with self.assertRaises(ValueError):
                module.analytical_probabilities(p)
        for n in (0, 10001, False, 2.5):
            with self.assertRaises(ValueError):
                module.simulate(n, 2, 0.1)
        for seed in (-1, 2147483648, True, 1.2):
            with self.assertRaises(ValueError):
                module.simulate(10, seed, 0.1)

    def test_cli_is_offline_and_nonclinical(self):
        result = subprocess.run([sys.executable, str(SCRIPT), "--shots", "64", "--readout-error", "0.1"],
                                capture_output=True, text=True, check=True)
        payload = json.loads(result.stdout)
        self.assertTrue(payload["noiseIsSynthetic"])
        self.assertFalse(payload["hardwareMeasured"])
        self.assertFalse(payload["productionApproved"])
        self.assertEqual(sum(payload["counts"].values()), 64)


if __name__ == "__main__":
    unittest.main()
