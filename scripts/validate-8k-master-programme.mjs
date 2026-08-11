import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import sharp from "sharp";

const root = process.cwd();
const policy = JSON.parse(readFileSync(resolve(root, "config/image-master-policy.json"), "utf8"));
const register = JSON.parse(readFileSync(resolve(root, "creative-assets/8k-master-register.json"), "utf8"));
const allowedStatuses = new Set(["source-acquisition-required", "in-review", "derivatives-ready", "released"]);
const allowedLicenceStatus = new Set(policy.governance.allowedLicenceStatus);

assert.equal(policy.master.minimumWidth, 7680, "8K policy minimum width must remain 7680");
assert.equal(policy.master.minimumHeight, 4320, "8K policy minimum height must remain 4320");
assert.equal(policy.master.neverUpscale, true, "8K programme must never manufacture resolution by upscaling");
assert.deepEqual(policy.derivatives.widths, [640, 960, 1600, 2560, 3840], "responsive derivative widths changed without governance review");
assert.deepEqual(policy.derivatives.formats, ["avif", "webp", "jpg"], "responsive formats changed without governance review");
assert.ok(["source-acquisition-required", "in-progress", "release-ready", "complete"].includes(register.programmeStatus));
assert.equal(register.qualifiedMasterCount, register.qualifiedMasters.length, "qualifiedMasterCount must match the registered native masters");
assert.ok(register.priorityQueue.length >= 5, "8K programme must retain a meaningful principal-module acquisition queue");

if (register.programmeStatus === "complete") {
  assert.ok(register.qualifiedMasters.length > 0, "8K programme cannot be called complete with no qualified native masters");
  assert.ok(register.priorityQueue.every((entry) => entry.status === "released"), "8K programme cannot be complete while priority routes are unreleased");
}

const ids = new Set();
for (const entry of register.qualifiedMasters) {
  for (const field of policy.governance.requiredFields) {
    assert.ok(entry[field], `${entry.id ?? "8K master"} is missing required governance field ${field}`);
  }
  assert.ok(!ids.has(entry.id), `duplicate 8K master ID: ${entry.id}`);
  ids.add(entry.id);
  assert.ok(allowedLicenceStatus.has(entry.licenceStatus), `${entry.id}: invalid licenceStatus`);
  assert.ok(allowedStatuses.has(entry.status), `${entry.id}: invalid status`);
  assert.ok(entry.master?.path, `${entry.id}: native master path is required`);
  const masterPath = resolve(root, entry.master.path);
  assert.ok(existsSync(masterPath), `${entry.id}: native master is not materialised at ${entry.master.path}`);
  const metadata = await sharp(masterPath).metadata();
  assert.ok((metadata.width ?? 0) >= policy.master.minimumWidth, `${entry.id}: master width ${metadata.width} is below native 8K minimum`);
  assert.ok((metadata.height ?? 0) >= policy.master.minimumHeight, `${entry.id}: master height ${metadata.height} is below native 8K minimum`);
  const sha256 = createHash("sha256").update(readFileSync(masterPath)).digest("hex");
  assert.equal(entry.master.sha256, sha256, `${entry.id}: native master hash changed without register update`);

  if (entry.derivatives) {
    for (const width of policy.derivatives.widths) {
      for (const format of policy.derivatives.formats) {
        const key = `${width}-${format}`;
        const derivative = entry.derivatives[key];
        assert.ok(derivative, `${entry.id}: missing required responsive derivative ${key}`);
        const derivativePath = resolve(root, derivative.path);
        assert.ok(existsSync(derivativePath), `${entry.id}: derivative ${key} is not materialised`);
        const derivativeMetadata = await sharp(derivativePath).metadata();
        assert.equal(derivativeMetadata.width, width, `${entry.id}: derivative ${key} width mismatch`);
        assert.ok((derivativeMetadata.width ?? 0) <= (metadata.width ?? 0), `${entry.id}: derivative ${key} may not exceed native master width`);
        const budget = policy.budgets[String(width)]?.[format];
        assert.ok(budget, `${entry.id}: no byte budget exists for ${key}`);
        assert.ok(statSync(derivativePath).size <= budget, `${entry.id}: derivative ${key} exceeds ${budget}-byte budget`);
      }
    }
  }
}

for (const entry of register.priorityQueue) {
  assert.ok(entry.route?.startsWith("/"), "8K priority queue routes must be absolute public paths");
  assert.ok(entry.purpose, `${entry.route}: 8K priority queue purpose is required`);
  assert.ok(allowedStatuses.has(entry.status), `${entry.route}: invalid priority status ${entry.status}`);
  if (entry.currentAsset) {
    assert.ok(existsSync(resolve(root, entry.currentAsset)), `${entry.route}: currentAsset does not exist: ${entry.currentAsset}`);
  }
}

console.log(
  `8K master programme validated: ${register.qualifiedMasters.length} native qualified masters; ${register.priorityQueue.length} priority routes; programmeStatus=${register.programmeStatus}. Upscaling is prohibited and responsive derivative governance is active.`,
);
