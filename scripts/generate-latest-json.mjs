#!/usr/bin/env node
// M1130: the Football OS fact pack — one committed JSON the personal page fetches.
// Two evidence paths, honest either way:
//   IN CI (any Linux runner, any close clone): git is asked the two questions directly —
//     `rev-parse --short HEAD` and `rev-list --count HEAD` — exact truth, no ledger needed.
//   IN THIS LOCAL WINDOWS SANDBOX: node cannot spawn shell tools (spawnSync ENOENT) and
//     execFileSync("git.exe") also ENOENT-fails, so the numbers fall back to this repository's
//     committed ledger (dev/status_report.md's 当前HEAD / 总提交数 lines, kept honest by every push),
//     with head from the last line of .git/logs/HEAD (the pre-push tip, true at generation time).
//   pwa_kb, assets → tests/perf/baseline.json (the real PWA budget measurement)
//   screens        → src/App.tsx (lazy feature-import count, a real count)
//   milestone_full → the 当前HEAD line itself (the honest sentence)
// A real-time fetch on the personal page, a weekly regenerate, and a total_commits that
// also moves every push — surfaced on the page with the generation date shown.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");

const tryGit = (...args) => {
  try {
    return execFileSync("git", args, { cwd: root, encoding: "utf8", timeout: 30000 }).trim();
  } catch {
    return null;
  }
};

const status = read("dev/status_report.md");
const carve = (name) => {
  const m = status.match(new RegExp(`(?:- )?\\*\\*${name}\\*\\*: (.*?)\\n`));
  return m ? m[1].trim() : "";
};
const headLine = carve("当前HEAD");
const commitsLine = carve("总提交数");
const ledgerCommits = Number(commitsLine.match(/(\d+)/)?.[1] ?? 0);
const ledgerMilestone = headLine.match(/M(\d+)/)?.[0] ?? "";
const milestoneFull = headLine
  .split("（")[0]
  .replace(/^本提交落地后为 /, "")
  .replace(/`/g, "")
  .trim();

const gitHead = tryGit("rev-parse", "--short", "HEAD");
const gitCount = tryGit("rev-list", "--count", "HEAD");
const totalCommits = gitCount != null ? Number(gitCount) : ledgerCommits;
const milestone = ledgerMilestone;

// Local fallback for head only when git itself is unavailable (see module header).
let head = gitHead ?? "";
if (!head) {
  try {
    const log = read(".git/logs/HEAD").split(/\r?\n/).filter(Boolean);
    const last = log[log.length - 1] ?? "";
    const m = last.match(/([0-9a-f]{40})\s+([0-9a-f]{40})/);
    head = m ? m[2].slice(0, 7) : "";
  } catch { /* absent in a shallow CI clone */ }
}

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
