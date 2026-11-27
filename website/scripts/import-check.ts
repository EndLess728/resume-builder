// Snapshot test for "Upload old resume". Parses every file in
// scripts/import-fixtures and compares the result with its .expected.json.
//
//   npx tsx scripts/import-check.ts           # check
//   npx tsx scripts/import-check.ts --update  # accept the current output
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import mammoth from 'mammoth';
import { extractDocxHtml, extractPdf, extractText } from '../src/builder/import/extract';
import { parseResume } from '../src/builder/import/parse';

const dir = join(import.meta.dirname, 'import-fixtures');
const update = process.argv.includes('--update');
const stripIds = (v: any): any =>
  Array.isArray(v) ? v.map(stripIds) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).filter(([k]) => k !== 'id').map(([k, x]) => [k, stripIds(x)])) : v;

let failed = 0;
for (const name of readdirSync(dir).filter((f) => /\.(pdf|docx|txt)$/.test(f)).sort()) {
  const buf = readFileSync(join(dir, name));
  const ex = name.endsWith('.pdf')
    ? await extractPdf(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer, pdfjs)
    : name.endsWith('.docx')
      ? extractDocxHtml((await mammoth.convertToHtml({ buffer: buf })).value)
      : extractText(buf.toString('utf8'));
  const got = JSON.stringify(stripIds(parseResume(ex)), null, 2) + '\n';
  const file = join(dir, `${name}.expected.json`);
  if (update || !existsSync(file)) {
    writeFileSync(file, got);
    console.log(`  wrote ${name}.expected.json`);
  } else if (readFileSync(file, 'utf8') !== got) {
    failed++;
    console.log(`✗ ${name} differs from ${name}.expected.json (run with --update to accept)`);
  } else console.log(`✓ ${name}`);
}
process.exit(failed ? 1 : 0);
