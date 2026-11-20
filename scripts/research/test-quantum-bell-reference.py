"""Analytical and negative-test evidence for tiny standard-library Bell baseline."""
import importlib.util
from pathlib import Path
import subprocess
import sys
import unittest

SCRIPT = Path(__file__).with_name('quantum-bell-reference.py')
spec = importlib.util.spec_from_file_location('bell_reference', SCRIPT)
ref = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ref)

class BellReferenceTests(unittest.TestCase):
    def test_exact_bell_state(self):
        p = ref.bell_state()
        for i, expected in enumerate((0.5, 0, 0, 0.5)):
            self.assertAlmostEqual(p[i], expected, places=12)
    def test_repeated_seed_same_histogram(self):
        a, b = ref.simulate(512,42), ref.simulate(512,42)
        self.assertEqual(a['counts'], b['counts'])
        self.assertEqual(a['experimentId'], b['experimentId'])
        self.assertEqual(sum(a['counts'].values()), 512)
        self.assertTrue(a['simulatedOnly'])
        self.assertFalse(a['hardwareMeasured'])
        self.assertFalse(a['productionApproved'])
        self.assertGreater(a['observed00Wilson95'][1], a['observed00Wilson95'][0])
    def test_reject_unbounded_or_noninteger_inputs(self):
        for shots in (0, -1, 10001, 1.5, True):
            with self.assertRaises(ValueError):
                ref.simulate(shots,42)
        for seed in (-1, 2147483648, 1.5, False):
            with self.assertRaises(ValueError):
                ref.simulate(512,seed)
    def test_wilson_bounds(self):
        for k in (0, 1, 256, 511, 512):
            lo, hi = ref.wilson_interval(k,512)
            self.assertTrue(0<=lo<=hi<=1)
    def test_cli_never_contacts_cloud(self):
        result=subprocess.run([sys.executable,str(SCRIPT),'--shots','32','--seed','9'],capture_output=True,text=True)
        self.assertEqual(result.returncode,0)
        self.assertIn('"simulatedOnly":true',result.stdout)
        self.assertIn('"hardwareMeasured":false',result.stdout)
if __name__=='__main__':unittest.main()
