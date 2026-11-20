"""No dependency downloads; negative/acceptance tests for local H2 benchmark gate."""
import importlib.util
import json
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

SCRIPT = Path(__file__).with_name("quantum-h2-benchmark.py")
spec = importlib.util.spec_from_file_location("quantum_h2_benchmark", SCRIPT)
h2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h2)

class H2SafetyTests(unittest.TestCase):
    def test_preflight_cannot_start_chemistry(self):
        result = subprocess.run([sys.executable, str(SCRIPT)], capture_output=True, text=True, check=True)
        report = json.loads(result.stdout)
        self.assertEqual(report["status"], "preflight-only")
        self.assertFalse(report["wouldExecute"])
        self.assertFalse(report["productionApproved"])
        self.assertEqual(report["configuration"]["basis"], "sto-3g")
        self.assertEqual(report["configuration"]["targetElectronCount"], 2)
    def test_execution_requires_extra_explicit_confirm(self):
        result = subprocess.run([sys.executable, str(SCRIPT), "--execute"], capture_output=True, text=True)
        self.assertEqual(result.returncode, 2)
        self.assertIn("--confirm-local-only required", result.stderr)
    def test_uninstalled_dependencies_cannot_run(self):
        with self.assertRaisesRegex(RuntimeError, "dependencies not installed"):
            h2.perform({name: None for name in h2.DEPENDENCIES})
    def test_only_fixed_small_molecule_is_described(self):
        config = h2.descriptor()
        self.assertEqual(config["maximumSpinOrbitals"], 4)
        self.assertEqual([x[0] for x in config["geometryAngstrom"]], ["H", "H"])
        self.assertGreater(config["fullCiComparisonToleranceHartree"], 0)
    def test_versions_preflight_missing_package_fails_closed(self):
        with patch.object(h2.metadata, "version", side_effect=h2.metadata.PackageNotFoundError):
            self.assertEqual(h2.dependency_versions(), {name: None for name in h2.DEPENDENCIES})

if __name__ == "__main__":
    unittest.main()
