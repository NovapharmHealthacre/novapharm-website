import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const configuration = JSON.parse(await readFile(path.join(root, "config/leadership-media.json"), "utf8"));
const formats = ["avif", "webp", "jpg"];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

// Reuse only bytes generated and verified in this exact hosted PR readiness job.
// No shared Actions cache, release cache, or local-build shortcut.
const runnerTemp = process.env.RUNNER_TEMP;
const useJobCache = process.env.GITHUB_ACTIONS === "true"
  && process.env.GITHUB_EVENT_NAME === "pull_request"
  && process.env.GITHUB_WORKFLOW === "Production readiness"
  && process.env.RUNNER_ENVIRONMENT === "github-hosted"
  && process.env.GITHUB_JOB === "verify"
  && Boolean(runnerTemp && process.env.GITHUB_RUN_ID && process.env.GITHUB_RUN_ATTEMPT);
const cacheKey = useJobCache ? sha256(JSON.stringify({
  root, run: process.env.GITHUB_RUN_ID, attempt: process.env.GITHUB_RUN_ATTEMPT,
  job: process.env.GITHUB_JOB, configuration, encoder: sharp.versions,
  generator: sha256(await readFile(new URL(import.meta.url)))
})) : null;
const receiptPath = cacheKey ? path.join(runnerTemp, `leadership-derivatives-${cacheKey}.json`) : null;
let previous = {};
if (receiptPath) {
  try {
    const parsed = JSON.parse(await readFile(receiptPath, "utf8"));
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) previous = parsed;
  } catch (error) {
    if (error.code !== "ENOENT" && !(error instanceof SyntaxError)) throw error;
  }
}
const verified = {};
let reused = 0;
let generated = 0;

async function writeDerivative(input, output, width, format) {
  let pipeline = sharp(input)
    .rotate()
    .flatten({ background: "#ffffff" })
    .resize({ width, withoutEnlargement: true });

  if (format === "avif") {
    pipeline = pipeline.avif({ quality: 65, effort: 6, chromaSubsampling: "4:4:4" });
  } else if (format === "webp") {
    pipeline = pipeline.webp({ quality: 88, effort: 6, smartSubsample: true });
  } else {
    pipeline = pipeline.jpeg({ quality: 91, mozjpeg: true, chromaSubsampling: "4:4:4" });
  }

  const bytes = await pipeline.toBuffer();
  await writeFile(output, bytes);
  return bytes;
}

for (const portrait of configuration.portraits) {
  const inputPath = path.join(root, portrait.master);
  const input = await readFile(inputPath);
  if (sha256(input) !== portrait.masterSha256) {
    throw new Error(`Approved leadership master checksum changed: ${portrait.master}`);
  }

  const metadata = await sharp(input).metadata();
  if (metadata.width !== portrait.width || metadata.height !== portrait.height) {
    throw new Error(`Approved leadership master dimensions changed: ${portrait.master}`);
  }

  const outputDirectory = path.dirname(path.join(root, portrait.outputBase));
  await mkdir(outputDirectory, { recursive: true });

  for (const width of portrait.widths) {
    const expectedHeight = Math.round((portrait.height / portrait.width) * width);
    for (const format of formats) {
      const extension = format === "jpg" ? "jpg" : format;
      const output = path.join(root, `${portrait.outputBase}-${width}.${extension}`);
      const relative = path.relative(root, output);
      // Validate one immutable byte buffer instead of a stat/metadata/read sequence.
      // This prevents time-of-check/time-of-use races in the receipt creation.
      let outputBytes;
      if (receiptPath && typeof previous[relative] === "string") {
        try {
          const candidate = await readFile(output);
          if (sha256(candidate) === previous[relative]) outputBytes = candidate;
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
        }
      }
      if (outputBytes) {
        reused++;
      } else {
        outputBytes = await writeDerivative(input, output, width, format);
        generated++;
      }

      const outputMetadata = await sharp(outputBytes).metadata();
      if (outputMetadata.width !== width || outputMetadata.height !== expectedHeight) {
        throw new Error(`Leadership derivative has incorrect dimensions: ${relative}`);
      }
      if (outputBytes.length > configuration.deliveryCeilingBytes) {
        throw new Error(`Leadership derivative exceeds ${configuration.deliveryCeilingBytes} bytes: ${relative}`);
      }
      if (receiptPath) verified[relative] = sha256(outputBytes);
    }
  }
}

// Publish a receipt only after every master and derivative has passed validation.
if (receiptPath) {
  const temporary = `${receiptPath}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(verified), { mode: 0o600 });
  await rename(temporary, receiptPath);
}

console.log(`Leadership derivatives: ${generated} encoded, ${reused} reused after checksum verification.`);
console.log(`Materialised ${configuration.portraits.length * formats.length * 3} responsive leadership derivatives from checksum-verified approved masters.`);
