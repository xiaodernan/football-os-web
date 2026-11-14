#!/usr/bin/env node
// M1130: the Football OS fact pack — one committed JSON the personal page fetches.
// NO SUBPROCESSES — this sandbox does not let node spawn shell tools on Windows; every number
// comes from this repository's own committed files:
//   head, total_commits, milestone → read from dev/status_report.md (kept honest by every push,
//                                    当前HEAD + 总提交数 lines, maintained in the commit's own message)
//   pwa_kb, assets                → tests/perf/baseline.json (the real PWA budget measurement)
//   screens                       → src/App.tsx (lazy feature-import count, a real count)
//   milestone_full               → the 当前HEAD line itself (the honest sentence)
// A real-time fetch on the personal page, a weekly regenerate here, and a total_commits that
// also moves every push — surfaced on the page with the generation date shown.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

const status = read("dev/status_report.md");
const carve = (name) => {
  const m = status.match(new RegExp(`(?:- )?\\*\\*${name}\\*\\*: (.*?)\\n`));
  return m ? m[1].trim() : "";
};
const headLine = carve("当前HEAD");
const commitsLine = carve("总提交数");
const totalCommits = Number(commitsLine.match(/(\d+)/)?.[1] ?? 0);
const milestone = headLine.match(/M(\d+)/)?.[0] ?? "";
const milestoneFull = headLine
  .split("（")[0]
  .replace(/^本提交落地后为 /, "")
  .replace(/`/g, "")
  .trim();

// Check coverage of the working tree truthfully: log the LAST N lines of .git/logs/HEAD for HEAD sha.
let head = "";
try {
  const log = read(".git/logs/HEAD").split(/\r?\n/).filter(Boolean);
  const last = log[log.length - 1] ?? "";
  const m = last.match(/([0-9a-f]{40})\s+([0-9a-f]{40})/);
  head = m ? m[2].slice(0, 7) : "";
} catch { /* absent in a shallow CI clone */ }

let pwaKb = null, assets = null;
try {
  const baseline = JSON.parse(read("tests/perf/baseline.json"));
  pwaKb = baseline?.build?.totalGzipKB ?? null;
  assets = baseline?.build?.fileCount ?? null;
} catch {}

const appTsx = read("src/App.tsx");
const screens = (appTsx.match(/lazy\(\(\) => import\("@\/features\//g) ?? []).length;

// A short list of the cinematic surfaces this world ships — names, not promises.
const CINEMATIC = [
  "The Chronicle — the epic fixture, AI-narrated",
  "Hall of Legends — the world's greatest",
  "World Atlas — the scale of the world",
  "The Derby Codex — the eternal meetings",
  "Prophet's Slate — the next eight told",
  "The Upsets — the night the model misread",
  "The Chapter — tonight's one chapter",
  "The Moonshots — the uncashed ceilings",
];

mkdirSync(resolve(root, "docs"), { recursive: true });
const out = {
  head,
  total_commits: totalCommits,
  milestone,
  milestone_full: milestoneFull,
  pwa_kb: pwaKb,
  assets,
  screens,
  feature_surface: CINEMATIC,
  generated_at: new Date().toISOString(),
};
writeFileSync(resolve(root, "docs/latest.json"), JSON.stringify(out, null, 2) + "\n", "utf8");
console.log(JSON.stringify(out, null, 2));
