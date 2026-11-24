"""Native inline package must preserve reviewed security and reader behavior."""
import ast
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_customer_admin_inline import build
import test_customer_admin_directory_api as access
import test_customer_admin_directory_reader as reader_tests

class InlinePackaging(unittest.TestCase):
    def test_template_preserves_controls(self):
        t = json.loads(build())
        old = json.loads((ROOT / "infra/aws/customer-admin-directory-candidate.json").read_text())
        self.assertEqual(t["Conditions"], old["Conditions"])
        self.assertEqual(t["Parameters"]["ReleaseEnabled"]["Default"], "false")
        for name, resource in old["Resources"].items():
            if name != "DirectoryFunction":
                self.assertEqual(t["Resources"][name], resource)
        f = t["Resources"]["DirectoryFunction"]["Properties"]
        orig = old["Resources"]["DirectoryFunction"]["Properties"]
        self.assertEqual({k:v for k,v in f.items() if k not in ("Code","Handler")}, {k:v for k,v in orig.items() if k not in ("Code","Handler")})
        self.assertEqual(f["Handler"], "index.handler")
        self.assertNotIn("ReservedConcurrentExecutions", f)
        self.assertEqual(f["Timeout"], 20)
        code = f["Code"]["ZipFile"]
        self.assertEqual(hashlib.sha256(code.encode()).hexdigest(), t["Metadata"]["CustomerDirectorySourceSHA256"])
        self.assertNotIn("def mint(", code)
        self.assertNotIn("def logout(", code)
        self.assertEqual(len([n for n in ast.parse(code).body if isinstance(n, ast.FunctionDef) and n.name == "handler"]), 1)
        self.assertLessEqual(len(build().encode()), 51200)

    def test_all_existing_contracts_on_inline_module(self):
        code = json.loads(build())["Resources"]["DirectoryFunction"]["Properties"]["Code"]["ZipFile"]
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp) / "index.py"
            file.write_text(code)
            spec = importlib.util.spec_from_file_location("inline_directory", file)
            module = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(module)
            with patch.object(access, "api", module), patch.object(access, "founder", module.founder), patch.object(reader_tests, "directory", module):
                suite = unittest.TestSuite([
                    unittest.defaultTestLoader.loadTestsFromTestCase(access.DirectoryAccessTests),
                    unittest.defaultTestLoader.loadTestsFromTestCase(reader_tests.DirectoryTests),
                ])
                result = unittest.TestResult()
                suite.run(result)
                self.assertTrue(result.wasSuccessful(), str(result.errors + result.failures))
                self.assertEqual(result.testsRun, 15)

if __name__ == "__main__":
    unittest.main()
