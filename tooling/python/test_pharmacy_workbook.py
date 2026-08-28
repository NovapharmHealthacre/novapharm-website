#!/usr/bin/env python3
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "tooling" / "python" / "pharmacy_workbook.py"


class PharmacyWorkbookTest(unittest.TestCase):
    def test_streams_typed_rows_and_preserves_blank_cells(self) -> None:
        with tempfile.TemporaryDirectory() as directory:
            workbook = Path(directory) / "fixture.xlsx"
            with zipfile.ZipFile(workbook, "w", zipfile.ZIP_DEFLATED) as archive:
                archive.writestr("xl/workbook.xml", '<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Pharmacies" sheetId="1" r:id="r1"/></sheets></workbook>')
                archive.writestr("xl/_rels/workbook.xml.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="r1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet1.xml"/></Relationships>')
                archive.writestr("xl/worksheets/sheet1.xml", '<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData><row r="1"><c r="A1" t="str"><v>master_row</v></c><c r="B1" t="str"><v>name</v></c></row><row r="2"><c r="A2" t="n"><v>2</v></c><c r="B2"/></row></sheetData></worksheet>')
            completed = subprocess.run([sys.executable, str(SCRIPT), str(workbook)], check=True, capture_output=True, text=True)
            records = [json.loads(line) for line in completed.stdout.splitlines()]
            self.assertEqual(records[0]["sheets"], ["Pharmacies"])
            self.assertEqual(records[1]["cells"], ["master_row", "name"])
            self.assertEqual(records[2]["cells"], [2, None])
            self.assertEqual(records[-1]["rowCounts"], {"Pharmacies": 2})


if __name__ == "__main__":
    unittest.main()
