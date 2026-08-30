export function sourceRow(headers: readonly string[], cells: readonly string[], rowNumber: number, source: string): ReadonlyMap<string, string> {
  if (!Number.isInteger(rowNumber) || rowNumber < 2) throw new Error(`${source} source row number is invalid.`);
  if (headers.length !== cells.length) throw new Error(`${source} row ${rowNumber} has ${cells.length} columns; ${headers.length} were expected.`);
  return new Map(headers.map((header, index) => [header.trim(), cells[index] ?? ""]));
}

export function sourceText(row: ReadonlyMap<string, string>, field: string, rowNumber: number, source: string, options: Readonly<{ maximum?: number; required?: boolean }> = {}): string | null {
  if (!row.has(field)) throw new Error(`${source} schema is missing ${field}.`);
  const value = String(row.get(field) ?? "").normalize("NFKC").trim().replace(/\s+/gu, " ");
  if (!value) {
    if (options.required) throw new Error(`${source} row ${rowNumber} is missing ${field}.`);
    return null;
  }
  const maximum = options.maximum ?? 1_000;
  if (value.length > maximum || /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/u.test(value)) throw new Error(`${source} row ${rowNumber} has invalid ${field}.`);
  return value;
}

export function sourceIdentifier(row: ReadonlyMap<string, string>, field: string, rowNumber: number, source: string, options: Readonly<{ maximum?: number; required?: boolean }> = {}): string | null {
  const textOptions = options.required === undefined ? { maximum: options.maximum ?? 160 } : { maximum: options.maximum ?? 160, required: options.required };
  const value = sourceText(row, field, rowNumber, source, textOptions);
  if (value && !/^[A-Z0-9._/-]+$/iu.test(value)) throw new Error(`${source} row ${rowNumber} has invalid ${field}.`);
  return value;
}

export function sourceNumber(row: ReadonlyMap<string, string>, field: string, rowNumber: number, source: string, options: Readonly<{ required?: boolean; nonnegative?: boolean }> = {}): number | null {
  const textOptions = options.required === undefined ? { maximum: 80 } : { maximum: 80, required: options.required };
  const value = sourceText(row, field, rowNumber, source, textOptions);
  if (value === null) return null;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/u.test(value)) throw new Error(`${source} row ${rowNumber} has non-numeric ${field}.`);
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || (options.nonnegative !== false && parsed < 0)) throw new Error(`${source} row ${rowNumber} has invalid ${field}.`);
  return parsed;
}

export function sourceMonth(row: ReadonlyMap<string, string>, field: string, rowNumber: number, source: string): Readonly<{ sourceValue: string; monthKey: string }> {
  const value = sourceText(row, field, rowNumber, source, { maximum: 7, required: true }) as string;
  const compact = value.replace("-", "");
  if (!/^(?:19|20)\d{2}(?:0[1-9]|1[0-2])$/u.test(compact)) throw new Error(`${source} row ${rowNumber} has invalid ${field}.`);
  return Object.freeze({ sourceValue: value, monthKey: `${compact.slice(0, 4)}-${compact.slice(4)}` });
}
