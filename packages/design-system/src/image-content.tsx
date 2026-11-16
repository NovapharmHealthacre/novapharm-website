"use client";

import React, { useEffect, useId, useRef, useState, type ChangeEvent, type MouseEventHandler } from "react";

/**
 * Web analogues of Apple HIG image views, image buttons and image wells.
 * Keep the licensed NovaPharm assets and browser-native controls: do not
 * import Apple's SwiftUI/UIKit views or extract SF Symbols for the web.
 */

export type ResponsiveImageSource = Readonly<{
  srcSet: string;
  type?: string;
  media?: string;
  sizes?: string;
}>;

export type ContentImageProps = Readonly<{
  src: string;
  alt: string;
  width: number;
  height: number;
  sources?: readonly ResponsiveImageSource[];
  sizes?: string;
  loading?: "lazy" | "eager";
  fit?: "cover" | "contain";
  className?: string;
}>;

/** A noninteractive image. The caller must provide meaningful alt, or "" for decoration. */
export function ContentImage({
  src, alt, width, height, sources = [], sizes, loading = "lazy", fit, className,
}: ContentImageProps) {
  return <picture className={className}>
    {sources.map((source, index) =>
      <source key={`${index}-${source.srcSet}`} srcSet={source.srcSet} type={source.type}
        media={source.media} sizes={source.sizes ?? sizes}/>)}
    <img src={src} alt={alt} width={width} height={height} loading={loading}
      decoding="async" sizes={sizes} style={{
        display: "block", maxWidth: "100%", height: "auto",
        ...(fit ? { objectFit: fit } : {}),
      }}/>
  </picture>;
}

export function ImageActionButton({
  label, onClick, disabled = false, className, ...image
}: ContentImageProps & Readonly<{
  label: string;
  onClick: MouseEventHandler<HTMLButtonElement>;
  disabled?: boolean;
}>) {
  return <button type="button" className={className} onClick={onClick} disabled={disabled}
    aria-label={label} title={label} style={{ minWidth: 44, minHeight: 44, cursor: disabled ? "default" : "pointer" }}>
    <ContentImage {...image} alt="" className={undefined} />
  </button>;
}

const MIME_BY_EXTENSION: Readonly<Record<string, string>> = Object.freeze({
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
});
export const MAX_LOCAL_IMAGE_BYTES = 5 * 1024 * 1024;

/** Filename and browser MIME are only first-stage local-preview checks, not virus scanning. */
export function validateLocalPreviewImage(
  file: Pick<File, "name" | "type" | "size">,
  maxBytes = MAX_LOCAL_IMAGE_BYTES,
): string | null {
  const suffix = file.name.toLowerCase().match(/\.[a-z0-9]+$/u)?.[0];
  if (!suffix || MIME_BY_EXTENSION[suffix] !== file.type) {
    return "Choose a JPEG, PNG, WebP or AVIF image. SVG and other file types are not supported.";
  }
  if (!Number.isFinite(file.size) || file.size <= 0) return "The selected image is empty or invalid.";
  if (file.size > Math.min(maxBytes, MAX_LOCAL_IMAGE_BYTES)) return "The selected image exceeds the 5 MB preview limit.";
  return null;
}

/**
 * Editable local preview, NOT an upload control. Selection and clearing are
 * temporary and do not mutate an account, medical record or server-side asset.
 */
export function LocalImageWell({ label, className }: Readonly<{ label: string; className?: string }>) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview.url); }, [preview]);

  const select = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.item(0);
    if (!file) return;
    const problem = validateLocalPreviewImage(file);
    event.currentTarget.value = "";
    if (problem) { setError(problem); return; }
    const url = URL.createObjectURL(file);
    setPreview({ url, name: file.name });
    setError(null);
  };
  const clear = () => {
    setPreview(null);
    setError(null);
    if (input.current) input.current.value = "";
  };

  return <section className={className} aria-labelledby={`${id}-title`}>
    <p id={`${id}-title`}><strong>{label}</strong></p>
    <p id={`${id}-help`}>Select an image to preview locally. Nothing is uploaded or saved. Maximum 5 MB; JPEG, PNG, WebP or AVIF.</p>
    <input ref={input} id={`${id}-file`} type="file"
      accept=".jpg,.jpeg,.png,.webp,.avif,image/jpeg,image/png,image/webp,image/avif"
      onChange={select} aria-describedby={`${id}-help`}/>
    {error ? <p role="alert">{error}</p> : null}
    {preview ? <div>
      <img src={preview.url} alt="Selected image preview" width={320} height={240}
        onError={() => { setPreview(null); setError("The selected file cannot be displayed as an image."); }}
        style={{ display: "block", maxWidth: "100%", height: "auto", objectFit: "contain" }}/>
      <p role="status">Local preview: {preview.name}</p>
      <button type="button" onClick={clear} style={{ minHeight: 44, minWidth: 44 }}>
        Clear image preview
      </button>
    </div> : <p role="status">No image selected.</p>}
  </section>;
}
