import { readFileSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(root, p), "utf8");
const has = (p) => readdirSync(resolve(root, p)).length >= 0;

// M1053: the CI workflows are part of the promise this repository makes. A workflow that
// leans on a path that doesn't exist, or silently skips a stage, is a lie the next person
// pays for. This proof reads both workflows line for line the way proof-services reads the
// ymls, and refuses the shapes the runbook forbids.

const stack = read(".github/workflows/spring-cloud-stack.yml");
const matrix = read(".github/workflows/spring-cloud-matrix.yml");

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

ok("both workflows exist and carry the mandatory structure (name, on:, jobs)",
  stack.includes("spring-cloud-stack") && stack.includes("on:") && stack.includes("jobs:") &&
  matrix.includes("spring-cloud-matrix") && matrix.includes("on:") && matrix.includes("jobs:"));

ok("both workflows check out the repository before doing anything",
  [stack, matrix].every((wf) => wf.includes("actions/checkout@v4")));

ok("both workflows give the reactor JDK 21",
  [stack, matrix].every((wf) => wf.includes("java-version: \"21\"") && wf.includes("temurin")));

ok("the stack workflow boots the four services with the committed verifier, not a reimplementation",
  stack.includes("node scripts/verify-services.mjs") && stack.includes("npm run build") && stack.includes("npm run proof") && stack.includes("npx playwright test"));

ok("the matrix workflow builds on both runner families, fail-fast off, and the reactor job is defined before the verify job that needs it",
  matrix.includes("ubuntu-latest") && matrix.includes("windows-latest") && matrix.includes("fail-fast: false") &&
  matrix.includes("spring-cloud-matrix") && matrix.includes("mvn") &&
  matrix.indexOf("reactor:") < matrix.indexOf("verify:") &&
  matrix.includes("never executed") && matrix.includes("it does not, cannot, and does not claim to exercise"));

ok("the stack workflow's job runs the mvn reactor before booting the stack",
  stack.indexOf("mvn") < stack.indexOf("node scripts/verify-services.mjs"));

// M1112: the stack's path filter is gone ON PURPOSE — the workflow runs the web build + full proof
// suite, and while it was service-side-only scoped the frontend half of that suite never re-ran in
// CI. Every master push now exercises it. The matrix keeps its service-side filter (it does not run
// the web suite at all).
ok("the stack workflow runs on every master push (no path filter), and the matrix's filter names only files in this repo",
  !stack.includes("paths:") &&
  ["services/**", "pom.xml", "scripts/verify-services.mjs", ".github/workflows/spring-cloud-matrix.yml"].every((p) => matrix.includes(p)));

ok("the workflows carry no secrets or tokens of their own, and each is big enough to boot",
  !/\$\{\{\s*(secrets|github\.token)\b/.test(stack) && !/\$\{\{\s*(secrets|github\.token)\b/.test(matrix) &&
  stack.length > 1000 && matrix.length > 1000 &&
  stack.includes("node scripts/verify-services.mjs") && matrix.includes("mvn -q -B -DskipTests package -f services/pom.xml"));

ok("the matrix workflow comments never claim the author's Docker Desktop is covered",
  matrix.includes("never executed") && !/prove.*docker desktop/i.test(matrix.replace(/does not[^\n]*\n/g, "")));

ok("the stack workflow orders node setup before npm ci and build before proof (build proves the pwa budget)",
  stack.indexOf("actions/setup-node") < stack.indexOf("npm ci") &&
  stack.indexOf("npm ci") < stack.indexOf("npm run build") &&
  stack.indexOf("npm run build") < stack.indexOf("npm run proof"));

// M1074: the live witnesses joined CI on purpose — the author's Docker Desktop cannot pull a single
// new image, so the strongest story (real Redis/RabbitMQ, honest UP/DOWN probes) only exists in
// this file. The witness order (build -> redis -> messaging -> dlq) is load-bearing: a witness
// that runs before the reactor builds its jars is a file that silently skips its stage. The honesty
// line must survive (never executed on this authoring machine); the path filter must name files
// that live in this repository; and the workflow must carry no credentials of its own.
const live = read(".github/workflows/spring-cloud-live.yml");
// M1112: the live witness workflow sheds its path filter for the same reason — it must boot the
// reactor + brokers AND the full proof suite, so a frontend-side red can no longer hide from its
// filter. The witness order (build -> redis -> parity -> messaging -> dlq) remains load-bearing.
ok("the live-witness workflow boots both broker-dependent arms in order after the reactor builds, honestly named, against this repo's own scripts, credential-free, unfiltered on master",
  live.includes("spring-cloud-live") && live.includes("on:") && live.includes("jobs:") &&
  live.includes("ubuntu-latest") && live.includes("actions/checkout@v4") &&
  live.includes("java-version: \"21\"") && live.includes("temurin") && live.includes("actions/setup-node") &&
  !live.includes("paths:") &&
  live.indexOf("run: mvn") < live.indexOf("run: node scripts/verify-redis-live.mjs") &&
  live.indexOf("run: node scripts/verify-redis-live.mjs") < live.indexOf("run: node scripts/verify-messaging-live.mjs") &&
  live.indexOf("run: node scripts/verify-messaging-live.mjs") < live.indexOf("run: node scripts/verify-messaging-dlq-live.mjs") &&
  live.indexOf("run: node scripts/verify-messaging-dlq-live.mjs") < live.indexOf("npm run proof") &&
  live.includes("--clean") && live.includes("never been executed") &&
  !/\$\{\{\s*(secrets|github\.token)\b/.test(live));

// M1112: the cache wire-parity witness became the FOURTH live arm. It must sit between the Redis
// read-through witness (it reuses that project-owned container on 16379, so Redis must have torn its
// keys/container down first) and the two messaging arms, carry --clean. The workflow shed its path
// filters on purpose — the registry-healthy proof suite covers the whole tree now.
const cacheParityStep = "run: node scripts/verify-cache-parity-live.mjs --clean";
ok("the fourth live witness (cache wire parity) runs after Redis and before messaging, with --clean",
  live.includes(cacheParityStep) &&
  live.indexOf("run: node scripts/verify-redis-live.mjs") < live.indexOf(cacheParityStep) &&
  live.indexOf(cacheParityStep) < live.indexOf("run: node scripts/verify-messaging-live.mjs") &&
  live.indexOf(cacheParityStep) < live.indexOf("npm run proof"));

// M1101: the LLM-live workflow — the second LIVE witness's CI vehicle. Honest about the secret:
// when secrets.LLM_API_KEY is set, the runner dials the real provider and proves the full
// round-trip; when it isn't, the witness degrades to UNVERIFIED-but-green, never red-but-faked.
// The workflow must (a) exist, (b) only run on master push/PR, (c) only invoke the committed
// witness — never a reimplementation, (d) set env LLM_API_KEY/LLM_BASE_URL/LLM_MODEL from
// secrets and never echo them, (e) never bake in a token, (f) include a bundle dist scan that
// chemically excludes the key. A missing secret is an honest UNVERIFIED, never a failure.
const llmWf = read(".github/workflows/spring-cloud-llm-live.yml");
ok("the LLM-live workflow exists, drives the committed verifier, never echoes secrets, and guards the bundle sk-",
  llmWf.includes("spring-cloud-llm-live") &&
  llmWf.includes("on:") && llmWf.includes("push:") && llmWf.includes("pull_request:") &&
  llmWf.includes("runs-on: ubuntu-latest") &&
  llmWf.includes("node scripts/verify-llm-live.mjs") &&
  llmWf.includes("${{ secrets.LLM_API_KEY }}") &&
  (llmWf.includes("LLM_BASE_URL") || llmWf.includes("LLM_MODEL")) &&
  !/echo.*LLM_API_KEY/.test(llmWf) &&
  !/printenv.*LLM/.test(llmWf) &&
  !/set -x\b/.test(llmWf) &&
  llmWf.includes('grep -rnI --exclude-dir=node_modules -E') &&
  llmWf.includes("dist/") &&
  ["scripts/llm-proxy.mjs", "scripts/llm-proxy.d.mts", "scripts/verify-llm-live.mjs",
    "scripts/proof-llm.mjs", "vite.config.ts", "package.json", ".env.example",
    ".github/workflows/spring-cloud-llm-live.yml"].every((p) => llmWf.includes(p)));

// M1079 / M1115: the conditional-GET witness became the FIFTH live arm — the one that needs no
// broker at all. Since M1113 there is deliberately no path filter anywhere (every master push
// runs the full gate), so this arm asserts the fifth witness is named and ordered correctly
// against the existing witness sequence; it does not demand a filter it no longer carries.
const cgStep = "run: node scripts/verify-conditional-get-live.mjs";
ok("the fifth live witness (conditional GET) is named in the job and runs after the broker chain, before the web floor",
  live.includes(cgStep) &&
  live.indexOf("run: node scripts/verify-messaging-dlq-live.mjs") < live.indexOf(cgStep) &&
  live.indexOf(cgStep) < live.indexOf("npm run proof") &&
  !live.includes("paths:"));

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
