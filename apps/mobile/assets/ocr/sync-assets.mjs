import { createHash } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('./', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('manifest.json', root), 'utf8'));
for (const asset of manifest.assets) {
  const target = new URL(asset.file, root);
  let bytes;
  if (process.argv.includes('--download')) {
    const response = await fetch(asset.url);
    if (!response.ok) throw new Error(`Download failed: ${asset.file}`);
    bytes = Buffer.from(await response.arrayBuffer());
  } else {
    bytes = await readFile(target);
  }
  if (
    bytes.length !== asset.bytes ||
    createHash('sha256').update(bytes).digest('hex') !== asset.sha256
  ) {
    throw new Error(`Pinned asset mismatch: ${asset.file}`);
  }
  if (process.argv.includes('--download')) await writeFile(target, bytes);
}
const sections = await Promise.all(
  manifest.notices.map(
    async (file) => `===== ${file} =====\n${await readFile(new URL(file, root), 'utf8')}`,
  ),
);
const notices =
  'Cena local OCR third-party notices\n\n' +
  'This software is based in part on the work of the Independent JPEG Group.\n' +
  'Runtime resources are unmodified. Source URLs and pinned versions: manifest.json and README.md.\n\n' +
  sections.join('\n\n');
const noticesUrl = new URL('THIRD_PARTY_NOTICES.txt', root);
if (process.argv.includes('--write-notices')) {
  await writeFile(noticesUrl, notices);
} else if ((await readFile(noticesUrl, 'utf8')) !== notices) {
  throw new Error('Third-party notices differ; run with --write-notices after reviewing licenses.');
}
console.log(
  `Verified ${manifest.assets.length} pinned OCR resources and ${manifest.notices.length} license notices.`,
);
