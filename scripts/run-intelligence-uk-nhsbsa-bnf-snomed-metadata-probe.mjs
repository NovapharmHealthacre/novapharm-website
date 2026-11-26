import { probeNhsbsaBnfSnomedMetadata } from "../src/core/intelligence-uk-nhsbsa-bnf-snomed-metadata-probe.mjs";

try {
  const receipt = await probeNhsbsaBnfSnomedMetadata();
  process.stdout.write(JSON.stringify(receipt) + "\n");
} catch {
  // No raw upstream body or query URL appears in CI logs.
  process.stderr.write("Official NHSBSA BNF/SNOMED metadata-only check failed closed.\n");
  process.exitCode = 1;
}
