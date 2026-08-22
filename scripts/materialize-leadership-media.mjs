import { createHash } from "node:crypto";
import { mkdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const configuration = JSON.parse(await readFile(path.join(root, "config/leadership-media.json"), "utf8"));
const formats = ["avif", "webp", "jpg"];

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

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

  await pipeline.toFile(output);
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
      await writeDerivative(input, output, width, format);

      const [outputMetadata, outputStat] = await Promise.all([sharp(output).metadata(), stat(output)]);
      if (outputMetadata.width !== width || outputMetadata.height !== expectedHeight) {
        throw new Error(`Leadership derivative has incorrect dimensions: ${path.relative(root, output)}`);
      }
      if (outputStat.size > configuration.deliveryCeilingBytes) {
        throw new Error(`Leadership derivative exceeds ${configuration.deliveryCeilingBytes} bytes: ${path.relative(root, output)}`);
      }
    }
  }
}

console.log(`Materialised ${configuration.portraits.length * formats.length * 3} responsive leadership derivatives from checksum-verified approved masters.`);
