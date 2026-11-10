/* ESCO supplier-image presentation correction.
 * Preserve the original catalogue photo and model provenance. Some supplier WebP
 * photographs contain an actual black backdrop; remove only edge-connected
 * dark pixels, without changing the equipment or claiming a verified variant.
 * One cached transformation serves hero, product cards, details, and Bag.
 */
const SOURCE = "/assets/media/esco/" + "esco-p07-" + "image03.webp";
let prepared;

function isOriginal(img) {
  if (!(img instanceof HTMLImageElement)) return false;
  try { return new URL(img.getAttribute("src") || "", document.baseURI).pathname === SOURCE; }
  catch { return false; }
}

async function cleanedSource() {
  const original = new Image();
  original.decoding = "async";
  original.src = SOURCE;
  await original.decode();
  if (!original.naturalWidth || !original.naturalHeight) throw new Error("Source image unavailable");
  const canvas = document.createElement("canvas");
  canvas.width = original.naturalWidth;
  canvas.height = original.naturalHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Image processing unavailable");
  ctx.drawImage(original, 0, 0);
  const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = frame.data;
  const w = canvas.width, h = canvas.height, total = w * h;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  const luminance = (i) => {
    const k = 4 * i;
    return (data[k] * 3 + data[k + 1] * 6 + data[k + 2]) / 10;
  };
  const neutralDark = (i) => {
    const k = 4 * i;
    const r = data[k], g = data[k + 1], b = data[k + 2];
    return data[k + 3] > 0 && luminance(i) < 93 &&
      Math.max(r, g, b) - Math.min(r, g, b) < 52;
  };
  let sampled = 0, darkEdges = 0;
  for (let x = 0; x < w; x++) {
    if (neutralDark(x)) darkEdges++;
    if (neutralDark((h - 1) * w + x)) darkEdges++;
    sampled += 2;
  }
  for (let y = 1; y < h - 1; y++) {
    if (neutralDark(y * w)) darkEdges++;
    if (neutralDark(y * w + w - 1)) darkEdges++;
    sampled += 2;
  }
  // A white or transparent replacement image must never be reprocessed.
  if (darkEdges < sampled * 0.22) return null;
  let head = 0, tail = 0;
  const push = i => {
    if (visited[i] || !neutralDark(i)) return;
    visited[i] = 1;
    queue[tail++] = i;
  };
  for (let x = 0; x < w; x++) { push(x); push((h - 1) * w + x); }
  for (let y = 1; y < h - 1; y++) { push(y * w); push(y * w + w - 1); }
  while (head < tail) {
    const i = queue[head++];
    const x = i % w;
    if (x > 0) push(i - 1);
    if (x + 1 < w) push(i + 1);
    if (i >= w) push(i - w);
    if (i + w < total) push(i + w);
  }
  for (let i = 0; i < total; i++) if (visited[i]) data[4 * i + 3] = 0;
  ctx.putImageData(frame, 0, 0);
  return canvas.toDataURL("image/png");
}

async function correctPhoto(img) {
  if (!isOriginal(img) || img.dataset.escoPhotoCleanup) return;
  img.dataset.escoPhotoCleanup = "processing";
  try {
    if (!prepared) prepared = cleanedSource();
    const cleaned = await prepared;
    if (cleaned && img.isConnected) {
      img.src = cleaned;
      img.dataset.escoPhotoCleanup = "cleaned";
    } else {
      img.dataset.escoPhotoCleanup = "not-needed";
    }
  } catch {
    // Fail open to the original supplier photograph instead of inventing imagery.
    img.dataset.escoPhotoCleanup = "unavailable";
  }
}
function scan(container) {
  if (container instanceof HTMLImageElement) correctPhoto(container);
  container.querySelectorAll?.("img").forEach(correctPhoto);
}
scan(document);
const observer = new MutationObserver(records => {
  for (const record of records) {
    for (const node of record.addedNodes) if (node instanceof Element) scan(node);
  }
});
observer.observe(document.body, { childList: true, subtree: true });
