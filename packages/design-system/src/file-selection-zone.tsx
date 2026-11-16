"use client";

import { useId, useState, type ChangeEvent, type DragEvent } from "react";

export type LocalFileCandidate = Readonly<{ name: string; type: string; size: number }>;
export type LocalFileSelection = Readonly<{ valid: boolean; error?: string }>;

function accepted(file: LocalFileCandidate, patterns: string): boolean {
  const options = patterns.split(",").map((item) => item.trim().toLowerCase()).filter(Boolean);
  if (!options.length) return false; // Never silently accept arbitrary files.
  const filename = file.name.toLowerCase();
  const mime = file.type.toLowerCase();
  return options.some((option) =>
    option.startsWith(".") ? filename.endsWith(option) :
    option.endsWith("/*") ? mime.startsWith(option.slice(0, -1)) :
    Boolean(mime) && mime === option);
}

/**
 * Client-side preflight only. Does not read, upload, persist, share or
 * independently authorise files. Every receiving endpoint MUST verify
 * authentication, permissions, content, size and malware separately.
 */
export function validateLocalFiles(
  files: readonly LocalFileCandidate[],
  accept: string,
  maxBytes: number,
  maxFiles: number,
): LocalFileSelection {
  if (!files.length) return { valid: false, error: "Choose a file before continuing." };
  if (!Number.isSafeInteger(maxFiles) || maxFiles < 1) return { valid: false, error: "File selection is unavailable." };
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) return { valid: false, error: "File selection is unavailable." };
  if (files.length > maxFiles) return { valid: false, error: `Select no more than ${maxFiles} ${maxFiles === 1 ? "file" : "files"}.` };
  for (const file of files) {
    if (!file.name || !accepted(file, accept)) {
      return { valid: false, error: "That file type is not accepted. Choose a supported format." };
    }
    if (!Number.isSafeInteger(file.size) || file.size < 0 || file.size > maxBytes) {
      return { valid: false, error: `Each file must be smaller than or equal to ${Math.ceil(maxBytes / 1024 / 1024)} MB.` };
    }
  }
  return { valid: true };
}

/**
 * File selection through a native, keyboard-accessible picker or optional
 * drag/drop. Parent receives File objects but must perform a separately
 * authorised upload action. This component NEVER transfers any data.
 */
export function FileSelectionZone({
  label,
  accept,
  onSelect,
  maxBytes = 10 * 1024 * 1024,
  maxFiles = 1,
  help,
}: Readonly<{
  label: string;
  accept: string;
  onSelect: (files: readonly File[]) => void;
  maxBytes?: number;
  maxFiles?: number;
  help?: string;
}>) {
  const id = useId();
  const [dragged, setDragged] = useState(false);
  const [message, setMessage] = useState("No files selected. Nothing is uploaded automatically.");
  const [error, setError] = useState(false);
  const review = (files: readonly File[]) => {
    const result = validateLocalFiles(files, accept, maxBytes, maxFiles);
    setError(!result.valid);
    if (!result.valid) {
      // Invalidate a previous accepted candidate. Otherwise consumers could
      // accidentally submit the earlier file after a later invalid selection.
      onSelect([]);
      setMessage(result.error ?? "Selection could not be validated.");
      return;
    }
    setMessage(`${files.length} ${files.length === 1 ? "file" : "files"} selected for review. Not uploaded.`);
    onSelect(files);
  };
  const onPickerChange = (event: ChangeEvent<HTMLInputElement>) => {
    review(Array.from(event.currentTarget.files ?? []));
    // Permit selecting the same file again after a rejected attempt.
    event.currentTarget.value = "";
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragged(false);
    review(Array.from(event.dataTransfer.files));
  };
  return <div className={`np-file-zone${dragged ? " np-file-zone--dragged" : ""}`}
    onDragEnter={(event) => { event.preventDefault(); setDragged(true); }}
    onDragLeave={(event) => { event.preventDefault(); setDragged(false); }}
    onDragOver={(event) => { event.preventDefault(); }}
    onDrop={onDrop}>
    <label htmlFor={id}>{label}</label>
    <p className="np-file-zone__help" id={`${id}-help`}>{help ?? "Use Browse files or drop files here. Selection does not upload files."}</p>
    <input id={id} type="file" accept={accept} multiple={maxFiles > 1} onChange={onPickerChange}
      aria-describedby={`${id}-help ${id}-status`} aria-invalid={error || undefined} />
    <p id={`${id}-status`} role="status" aria-live="polite">{message}</p>
  </div>;
}
