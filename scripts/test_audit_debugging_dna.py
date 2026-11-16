"""Regression tests for complete, read-only Git-object debugging inventory."""
import subprocess
import tempfile
import unittest
from pathlib import Path

from audit_debugging_dna import scan_repository


def fixture(files: dict[str, str]):
    temporary = tempfile.TemporaryDirectory(prefix="novapharm-debug-dna-")
    root = Path(temporary.name)
    subprocess.run(["git", "init", "-q"], cwd=root, check=True)
    for filename, contents in files.items():
        target = root.joinpath(filename)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(contents, encoding="utf-8")
    subprocess.run(["git", "add", "-A"], cwd=root, check=True)
    subprocess.run(["git", "-c", "user.name=Audit Fixture",
                    "-c", "user.email=audit-fixture@example.invalid",
                    "commit", "-q", "-m", "test fixture"], cwd=root, check=True)
    return temporary, root


MODULES = '[ ' + ','.join(f'{{"code":"M{i:02d}"}}' for i in range(1, 55)) + ' ]'


class DebuggingDNARegression(unittest.TestCase):
    def test_inventory_counts_every_tracked_blob_without_exporting_content(self):
        temporary, root = fixture({
            "index.html": '<!doctype html><html><body><main id="main"></main></body></html>',
            "apps/corporate/app/page.tsx": "export default function Page() { return null; }",
            "apps/founder/app/page.tsx": "export default function Page() { return null; }",
            "apps/technology/app/page.tsx": "export default function Page() { return null; }",
            "apps/status/app/page.tsx": "export default function Page() { return null; }",
            "apps/portal/app/page.tsx": "export default function Page() { return null; }",
            "assets/js/site.js": "export const ok = true;",
            "packages/portal-contracts/src/module-catalog.json": MODULES,
        })
        with temporary:
            result = scan_repository(root)
            self.assertEqual(result["summary"]["trackedFiles"], 8)
            self.assertEqual(result["summary"]["portalModules"], 54)
            self.assertEqual(result["summary"]["errors"], 0)
            self.assertEqual(result["summary"]["routeFiles"], 6)
            self.assertEqual(result["summary"]["inspectedText"], 8)
            self.assertNotIn("export const ok", str(result))
            self.assertTrue(result["summary"]["byEstate"]["portal"])

    def test_rejects_bad_json_and_public_debug_assets(self):
        temporary, root = fixture({
            "packages/portal-contracts/src/module-catalog.json": MODULES,
            "assets/js/site.js": "const x = 1;\n" + "debug" + "ger;\n",
            "assets/js/site.js.map": "{}",
            "docs/invalid.json": "{bad json",
        })
        with temporary:
            report = scan_repository(root)
            rules = {item["rule"] for item in report["findings"]}
            self.assertTrue({"production-debugger", "public-sourcemap",
                             "json-invalid"}.issubset(rules))
            self.assertNotIn("{bad json", str(report))

    def test_duplicate_id_is_warning_not_runtime_certification(self):
        temporary, root = fixture({
            "packages/portal-contracts/src/module-catalog.json": MODULES,
            "index.html": '<!doctype html><html><body><p id="same"></p>'
                          '<p id="same"></p></body></html>',
        })
        with temporary:
            report = scan_repository(root)
            self.assertEqual(report["summary"]["errors"], 0)
            self.assertTrue(any(item["rule"] == "html-duplicate-id"
                                for item in report["findings"]))

    def test_changes_to_worktree_do_not_change_exact_commit_results(self):
        temporary, root = fixture({
            "packages/portal-contracts/src/module-catalog.json": MODULES,
            "index.html": "<!doctype html><html><body></body></html>",
        })
        with temporary:
            original = scan_repository(root)
            (root / "index.html").write_text("debugger;", encoding="utf-8")
            changed = scan_repository(root)
            self.assertEqual(original, changed)


if __name__ == "__main__":
    unittest.main()
