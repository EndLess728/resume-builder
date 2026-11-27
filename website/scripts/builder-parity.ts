// Checks that the web builder generates the same Typst as RenderCV.
//
//   rendercv render my.yaml
//   npx tsx scripts/builder-parity.ts my.yaml rendercv_output/My_Name_CV.typ [--roundtrip]
//
// --roundtrip first imports the YAML into the builder's form state and exports
// it again, which is the path a user takes. Run on the same day as `rendercv
// render`, since both stamp today's date into the "Last updated" note.
import { readFileSync } from 'node:fs';
import YAML from 'yaml';
import { renderTypst } from '../src/builder/render';
import { fromYaml, toCv } from '../src/builder/rendercv';

const [yamlPath, typPath, flag] = process.argv.slice(2);
if (!yamlPath || !typPath) {
  console.error('usage: builder-parity.ts <cv.yaml> <rendercv-generated.typ> [--roundtrip]');
  process.exit(2);
}
const text = readFileSync(yamlPath, 'utf8');
const cv = flag === '--roundtrip' ? toCv(fromYaml(text).resume) : YAML.parse(text).cv;
const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);
const mine = lines(renderTypst(cv));
const theirs = lines(readFileSync(typPath, 'utf8'));

let diffs = 0;
for (let i = 0; i < Math.max(mine.length, theirs.length); i++) {
  if (mine[i] === theirs[i]) continue;
  if (diffs++ < 10) console.log(`line ${i + 1}\n  builder:  ${mine[i] ?? '(none)'}\n  rendercv: ${theirs[i] ?? '(none)'}`);
}
console.log(diffs ? `✗ ${diffs} line(s) differ` : '✓ identical to RenderCV');
process.exit(diffs ? 1 : 0);
