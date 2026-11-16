import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ContentImage, ImageActionButton, LocalImageWell, MAX_LOCAL_IMAGE_BYTES,
  validateLocalPreviewImage,
} from "../src/image-content.tsx";

test("image views preserve intrinsic ratio, responsive sources and semantic alt", () => {
  const markup = renderToStaticMarkup(<ContentImage
    src="/assets/approved/pack.jpg" alt="Approved product pack" width={480} height={600}
    sources={[{ srcSet: "/assets/approved/pack-960.webp 960w, /assets/approved/pack-480.webp 480w",
      type: "image/webp", sizes: "(max-width: 600px) 80vw, 480px" }]} />);
  assert.match(markup, /<picture/);
  assert.match(markup, /type="image\/webp"/);
  assert.match(markup, /srcSet="[^"]*960w/);
  assert.match(markup, /alt="Approved product pack"/);
  assert.match(markup, /width="480" height="600"/);
  assert.match(markup, /loading="lazy"/);
  assert.match(markup, /height:auto/);
});

test("image actions use a native named button and hide duplicate image text", () => {
  const markup = renderToStaticMarkup(<ImageActionButton
    src="/assets/approved/preview.jpg" alt="This text should be decorative within the button"
    width={120} height={90} label="Show larger image" onClick={() => undefined} />);
  assert.match(markup, /<button type="button"/);
  assert.match(markup, /aria-label="Show larger image"/);
  assert.match(markup, /min-width:44px;min-height:44px/);
  assert.match(markup, /<img[^>]*alt=""/);
  assert.doesNotMatch(markup, /This text should be decorative/);
});

test("image well explains local-only behavior and exposes keyboard-native file controls", () => {
  const markup = renderToStaticMarkup(<LocalImageWell label="Review photo" />);
  assert.match(markup, /Nothing is uploaded or saved/);
  assert.match(markup, /Select, drop or paste an image/);
  assert.match(markup, /Press Delete to clear/);
  assert.match(markup, /type="file"/);
  assert.match(markup, /aria-describedby="[^"]+-help"/);
  assert.match(markup, /No image selected/);
  assert.doesNotMatch(markup, /<form|method="post"|fetch\(/);
});

test("local preview refuses unsupported, mismatched, empty and oversize files", () => {
  const valid = { name: "product.JPG", type: "image/jpeg", size: 100_000 };
  assert.equal(validateLocalPreviewImage(valid), null);
  assert.equal(validateLocalPreviewImage({ ...valid, name: "file.svg", type: "image/svg+xml" }) !== null, true);
  assert.equal(validateLocalPreviewImage({ ...valid, name: "file.png" }) !== null, true);
  assert.equal(validateLocalPreviewImage({ ...valid, size: 0 }) !== null, true);
  assert.equal(validateLocalPreviewImage({ ...valid, size: MAX_LOCAL_IMAGE_BYTES + 1 }) !== null, true);
  assert.equal(validateLocalPreviewImage({ ...valid, name: "image.avif", type: "image/avif" }), null);
});
