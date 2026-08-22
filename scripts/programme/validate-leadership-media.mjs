import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const root = process.cwd();
const configuration = JSON.parse(await readFile(path.join(root, "config/leadership-media.json"), "utf8"));
const formats = ["avif", "webp", "jpg"];

for (const obsoletePublicMaster of ["assets/vishalchakravarty.png", "assets/prabhakarvitthallahare.png", "assets/girishshantilalachliya.png"]) {
  if (existsSync(path.join(root, obsoletePublicMaster))) {
    throw new Error(`Unoptimised leadership master remains publicly deliverable: ${obsoletePublicMaster}`);
  }
}

for (const portrait of configuration.portraits) {
  const masterPath = path.join(root, portrait.master);
  const master = await readFile(masterPath);
  const masterHash = createHash("sha256").update(master).digest("hex");
  if (masterHash !== portrait.masterSha256) {
    throw new Error(`Approved leadership master checksum changed: ${portrait.master}`);
  }

  for (const width of portrait.widths) {
    const expectedHeight = Math.round((portrait.height / portrait.width) * width);
    for (const format of formats) {
      const relative = `${portrait.outputBase}-${width}.${format}`;
      const absolute = path.join(root, relative);
      const [metadata, file] = await Promise.all([sharp(absolute).metadata(), stat(absolute)]);
      if (metadata.width !== width || metadata.height !== expectedHeight) {
        throw new Error(`Leadership derivative dimensions changed: ${relative}`);
      }
      if (file.size > configuration.deliveryCeilingBytes) {
        throw new Error(`Leadership derivative exceeds the delivery ceiling: ${relative}`);
      }
    }
  }
}

console.log(`Leadership-media validation passed for ${configuration.portraits.length} approved masters and ${configuration.portraits.length * formats.length * 3} responsive derivatives.`);
