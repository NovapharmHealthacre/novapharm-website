import { constants } from 'node:fs';
import { open } from 'node:fs/promises';
import { resolve } from 'node:path';
import { verifyUkNationalArchiveBytes } from '../../src/core/uk-national-source-archive-preflight.mjs';

function argumentsFrom(values) {
  const options = new Map();
  for (let i = 0; i < values.length; i += 2) {
    const name = values[i];
    const value = values[i + 1];
    if (!['--manifest','--archive','--root'].includes(name) || !value || options.has(name))
      throw new Error('Expected exactly --manifest PATH --archive PATH --root PRIVATE_QUARANTINE_ROOT');
    options.set(name,resolve(value));
  }
  if (options.size !== 3) throw new Error('All three archive preflight arguments are required.');
  return options;
}

try {
  const options = argumentsFrom(process.argv.slice(2));
  const file = options.get('--manifest');
  // Read/validate through the same NOFOLLOW descriptor to avoid stat-to-open races.
  const manifestHandle = await open(file, constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0));
  let source;
  try {
    const status = await manifestHandle.stat();
    if (!status.isFile() || status.size <= 0 || status.size > 20_000)
      throw new Error('Manifest size/format is invalid.');
    source = await manifestHandle.readFile({encoding: 'utf8'});
  } finally { await manifestHandle.close(); }
  const manifest = JSON.parse(source);
  const receipt = await verifyUkNationalArchiveBytes(manifest, {
    archivePath: options.get('--archive'),
    quarantineRoot: options.get('--root'),
  });
  process.stdout.write(JSON.stringify(receipt) + '\n');
} catch {
  // Avoid echoing potentially sensitive source paths or raw medical content.
  process.stderr.write('UK source archive integrity preflight refused; no medicine data admitted.\n');
  process.exitCode = 1;
}
