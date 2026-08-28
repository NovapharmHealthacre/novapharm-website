#!/usr/bin/env python3
"""Stream a governed XLSX workbook as typed JSON Lines without office macros."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import sys
import zipfile
from pathlib import Path, PurePosixPath
from typing import Any, Iterator
from xml.etree import ElementTree

MAIN_NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
REL_NS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"
PACKAGE_REL_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
MAX_ARCHIVE_MEMBERS = 512
MAX_MEMBER_BYTES = 512 * 1024 * 1024
MAX_TOTAL_UNCOMPRESSED_BYTES = 1024 * 1024 * 1024
CELL_REFERENCE = re.compile(r"^([A-Z]+)([1-9][0-9]*)$")
INTEGER = re.compile(r"^-?(?:0|[1-9][0-9]*)$")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_archive(archive: zipfile.ZipFile) -> None:
    members = archive.infolist()
    if len(members) > MAX_ARCHIVE_MEMBERS:
        raise ValueError("Workbook archive contains too many members.")
    total = 0
    for member in members:
        path = PurePosixPath(member.filename)
        if path.is_absolute() or ".." in path.parts:
            raise ValueError("Workbook archive contains an unsafe member path.")
        if member.flag_bits & 0x1:
            raise ValueError("Encrypted workbook members are not supported.")
        if member.file_size > MAX_MEMBER_BYTES:
            raise ValueError("Workbook member exceeds the approved extraction limit.")
        total += member.file_size
    if total > MAX_TOTAL_UNCOMPRESSED_BYTES:
        raise ValueError("Workbook archive exceeds the approved uncompressed limit.")


def normalise_member(target: str) -> str:
    candidate = target.lstrip("/")
    if not candidate.startswith("xl/"):
        candidate = f"xl/{candidate}"
    path = PurePosixPath(candidate)
    if path.is_absolute() or ".." in path.parts:
        raise ValueError("Workbook relationship contains an unsafe target.")
    return str(path)


def workbook_sheets(archive: zipfile.ZipFile) -> list[tuple[str, str]]:
    relationships = ElementTree.fromstring(archive.read("xl/_rels/workbook.xml.rels"))
    targets = {
        relation.attrib["Id"]: normalise_member(relation.attrib["Target"])
        for relation in relationships.findall(f"{{{PACKAGE_REL_NS}}}Relationship")
        if relation.attrib.get("Type", "").endswith("/worksheet")
    }
    workbook = ElementTree.fromstring(archive.read("xl/workbook.xml"))
    sheets: list[tuple[str, str]] = []
    for sheet in workbook.findall(f".//{{{MAIN_NS}}}sheet"):
        name = sheet.attrib.get("name", "").strip()
        relationship_id = sheet.attrib.get(f"{{{REL_NS}}}id", "")
        target = targets.get(relationship_id)
        if not name or not target:
            raise ValueError("Workbook contains an unresolved worksheet relationship.")
        sheets.append((name, target))
    if not sheets:
        raise ValueError("Workbook contains no worksheets.")
    return sheets


def shared_strings(archive: zipfile.ZipFile) -> list[str]:
    if "xl/sharedStrings.xml" not in archive.namelist():
        return []
    values: list[str] = []
    root = ElementTree.fromstring(archive.read("xl/sharedStrings.xml"))
    for item in root.findall(f"{{{MAIN_NS}}}si"):
        values.append("".join(node.text or "" for node in item.iter(f"{{{MAIN_NS}}}t")))
    return values


def column_index(reference: str) -> int:
    match = CELL_REFERENCE.fullmatch(reference)
    if not match:
        raise ValueError(f"Invalid worksheet cell reference: {reference}")
    value = 0
    for character in match.group(1):
        value = value * 26 + ord(character) - 64
    return value - 1


def numeric_value(raw: str) -> int | float | str:
    if INTEGER.fullmatch(raw):
        try:
            return int(raw)
        except ValueError:
            return raw
    try:
        value = float(raw)
    except ValueError:
        return raw
    return value if value == value and abs(value) != float("inf") else raw


def cell_value(cell: ElementTree.Element, strings: list[str]) -> Any:
    data_type = cell.attrib.get("t", "n")
    if data_type == "inlineStr":
        return "".join(node.text or "" for node in cell.iter(f"{{{MAIN_NS}}}t"))
    raw = cell.findtext(f"{{{MAIN_NS}}}v")
    if raw is None:
        return None
    if data_type == "s":
        index = int(raw)
        if index < 0 or index >= len(strings):
            raise ValueError("Worksheet references an invalid shared-string index.")
        return strings[index]
    if data_type == "b":
        return raw == "1"
    if data_type in {"str", "e", "d"}:
        return raw
    return numeric_value(raw)


def stream_sheet(archive: zipfile.ZipFile, sheet_name: str, member: str, strings: list[str]) -> Iterator[dict[str, Any]]:
    with archive.open(member) as source:
        for event, element in ElementTree.iterparse(source, events=("end",)):
            if element.tag != f"{{{MAIN_NS}}}row":
                continue
            row_number = int(element.attrib.get("r", "0"))
            if row_number < 1:
                raise ValueError("Worksheet row is missing a valid row number.")
            cells: list[Any] = []
            cell_types: list[str | None] = []
            formulas: dict[str, str] = {}
            styles: dict[str, int] = {}
            for cell in element.findall(f"{{{MAIN_NS}}}c"):
                reference = cell.attrib.get("r", "")
                index = column_index(reference)
                while len(cells) <= index:
                    cells.append(None)
                    cell_types.append(None)
                cells[index] = cell_value(cell, strings)
                cell_types[index] = cell.attrib.get("t", "n")
                formula = cell.findtext(f"{{{MAIN_NS}}}f")
                if formula is not None:
                    formulas[str(index)] = formula
                if "s" in cell.attrib:
                    styles[str(index)] = int(cell.attrib["s"])
            yield {
                "kind": "row",
                "sheet": sheet_name,
                "rowNumber": row_number,
                "cells": cells,
                "cellTypes": cell_types,
                "formulas": formulas,
                "styles": styles,
            }
            element.clear()


def emit(value: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(value, ensure_ascii=False, separators=(",", ":")) + "\n")


def main() -> int:
    parser = argparse.ArgumentParser(description="Stream a macro-free XLSX workbook as governed JSON Lines.")
    parser.add_argument("workbook", type=Path)
    arguments = parser.parse_args()
    workbook = arguments.workbook.expanduser().resolve()
    if workbook.suffix.lower() != ".xlsx" or not workbook.is_file():
        raise ValueError("Provide an existing .xlsx workbook.")
    with zipfile.ZipFile(workbook, "r") as archive:
        validate_archive(archive)
        sheets = workbook_sheets(archive)
        strings = shared_strings(archive)
        emit({
            "kind": "workbook",
            "fileName": workbook.name,
            "sizeBytes": workbook.stat().st_size,
            "sha256": sha256_file(workbook),
            "sheets": [name for name, _ in sheets],
            "macrosPresent": any(member.filename.lower().endswith("vbaproject.bin") for member in archive.infolist()),
        })
        row_counts: dict[str, int] = {}
        for name, member in sheets:
            count = 0
            for row in stream_sheet(archive, name, member, strings):
                emit(row)
                count += 1
            row_counts[name] = count
        emit({"kind": "complete", "rowCounts": row_counts})
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, zipfile.BadZipFile, ElementTree.ParseError) as error:
        sys.stderr.write(f"pharmacy_workbook: {error}\n")
        raise SystemExit(1) from error
