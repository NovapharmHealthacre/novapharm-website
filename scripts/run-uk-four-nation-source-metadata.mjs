import { probeAllFourUkPublishers } from "../src/core/uk-four-nation-source-metadata.mjs";
try {
  const receipts = await probeAllFourUkPublishers();
  // Four sanitized receipts: no raw medicine rows, source CSV or workbook contents.
  process.stdout.write(JSON.stringify(receipts, null, 2) + "\n");
} catch {
  process.stderr.write("UK four-nation official publisher metadata check failed closed. No medicine data admitted.\n");
  process.exitCode = 1;
}
