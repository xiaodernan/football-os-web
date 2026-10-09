// Derives the vacuity census's owing list on a PLANE, not in this checkout.
//
// The census in scripts/proof-i18n.mjs scans the working tree, and this tree is shared: other
// sessions leave proof scripts dirty. So a ceiling read off `node scripts/proof-i18n.mjs` can be a
// measurement no checkout of the commit reproduces. This tool rebuilds the bytes a commit ships —
// every dirty script at HEAD, except the ones named here, whose worktree bytes are kept — and runs
// the shipped census block over them. It prints the plane's own VACUITY_CEILING and whether the
// count clears it.
//
//   shipped plane (my nine files, everything else at HEAD):
//     node dev/m326-ceiling-plane.mjs proof-ai-grounding proof-analytics proof-feedranking \
//       proof-m99 proof-offline proof-screens proof-world proof-xp proof-i18n
//   same plane with those eight paydowns reverted, which must go OVER the ceiling:
//     node dev/m326-ceiling-plane.mjs proof-i18n
//
// The plane lives in the OS temp dir, never under the repo root: a frozen copy inside the root is
// itself counted by the repo's file-walking gates.
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, rmSync, mkdirSync, writeFileSync, cpSync, existsSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const keep = process.argv.slice(2);
for (const k of keep) if (!/^proof-[\w-]+$/.test(k)) throw new Error(`bad script name "${k}"`);

const git = (args) => execFileSync('git', args, {
  cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024,
});
const dirty = git(['diff', '--name-only', '--', 'scripts/proof-*.mjs'])
  .split(/\r?\n/).filter(Boolean).map((p) => basename(p));
const unknown = keep.filter((k) => !dirty.includes(`${k}.mjs`));
if (unknown.length) throw new Error(`kept files are not dirty, so HEAD already ships them: ${unknown.join(', ')}`);

// The census block itself computes join(root, 'scripts'), so `root` is the plane's parent.
const planeRoot = join(tmpdir(), `m326-plane-${keep.length ? 'shipped' : 'reverted'}`);
const plane = join(planeRoot, 'scripts');
rmSync(planeRoot, { recursive: true, force: true });
mkdirSync(plane, { recursive: true });
cpSync(join(root, 'scripts'), plane, { recursive: true });
let swapped = 0;
for (const b of dirty) {
  if (keep.includes(basename(b, '.mjs'))) continue;
  if (!existsSync(join(plane, b))) throw new Error(`${b} is not a script in the census dir`);
  writeFileSync(join(plane, b), git(['show', `HEAD:scripts/${b}`]));
  swapped++;
}

const lines = readFileSync(join(plane, 'proof-i18n.mjs'), 'utf8').split(/\r?\n/);
const start = lines.findIndex((l) => l.startsWith('const clauseDepth'));
const end = lines.findIndex((l) => l.startsWith("ok(`the suite's own zero-asserting"));
if (start < 0 || end < 0) throw new Error(`census markers not found on the plane: ${start} ${end}`);
const ceilingLine = lines.find((l) => l.startsWith('const VACUITY_CEILING'));
if (!ceilingLine) throw new Error('no VACUITY_CEILING on the plane');
const ceiling = Number(ceilingLine.match(/=\s*(\d+)/)[1]);

const readings = [];
const fn = new Function('readdirSync', 'readFileSync', 'join', 'root', 'ok', 'VACUITY_CEILING',
  lines.slice(start, end).join('\n') + '\nreturn { unguardedZeroes, proofFiles };');
const { unguardedZeroes, proofFiles } = fn(
  readdirSync, (p, enc) => readFileSync(p, enc), join, planeRoot,
  (label, pass) => readings.push({ label, pass }), ceiling);

for (const k of unguardedZeroes) console.log(k);
const verdict = unguardedZeroes.length <= ceiling ? 'WITHIN' : 'OVER';
console.log(`TOTAL ${unguardedZeroes.length} across ${proofFiles.length} scripts; `
  + `ceiling on this plane ${ceiling}; ${verdict}; ${swapped} scripts swapped to HEAD bytes`);
rmSync(planeRoot, { recursive: true, force: true });
