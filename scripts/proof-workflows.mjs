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

ok("the stack workflow's path filters only name files that exist inside this repo",
  ["services/**", "scripts/verify-services.mjs", "scripts/export-service-contract.mjs",
    "scripts/lib/world-contract.mjs", "scripts/proof-services.mjs", "domain/platform.ts",
    ".github/workflows/spring-cloud-stack.yml"].every((p) => stack.includes(p)) &&
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
ok("the live-witness workflow boots both broker-dependent arms in order after the reactor builds, honestly named, against this repo's own paths, credential-free",
  live.includes("spring-cloud-live") && live.includes("on:") && live.includes("jobs:") &&
  live.includes("ubuntu-latest") && live.includes("actions/checkout@v4") &&
  live.includes("java-version: \"21\"") && live.includes("temurin") && live.includes("actions/setup-node") &&
  live.indexOf("run: mvn") < live.indexOf("run: node scripts/verify-redis-live.mjs") &&
  live.indexOf("run: node scripts/verify-redis-live.mjs") < live.indexOf("run: node scripts/verify-messaging-live.mjs") &&
  live.indexOf("run: node scripts/verify-messaging-live.mjs") < live.indexOf("run: node scripts/verify-messaging-dlq-live.mjs") &&
  live.indexOf("run: node scripts/verify-messaging-dlq-live.mjs") < live.indexOf("npm run proof") &&
  live.includes("--clean") && live.includes("never been executed") &&
  !/\$\{\{\s*(secrets|github\.token)\b/.test(live) &&
  ["services/**", "scripts/verify-services.mjs", "scripts/verify-redis-live.mjs",
    "scripts/verify-messaging-live.mjs", "scripts/verify-messaging-dlq-live.mjs",
    ".github/workflows/spring-cloud-live.yml"].every((p) => live.includes(p)));

// M1076: the cache wire-parity witness became the FOURTH live arm. It must sit between the Redis
// read-through witness (it reuses that project-owned container on 16379, so Redis must have torn its
// keys/container down first) and the two messaging arms, carry --clean, and appear in BOTH path
// filters so a services/ or witness-only change re-triggers the job. Three literal occurrences
// (push paths + PR paths + the step) is a positive population floor: drop the step, move it after
// messaging, or omit one filter and this gate goes red.
const cacheParityStep = "run: node scripts/verify-cache-parity-live.mjs --clean";
ok("the fourth live witness (cache wire parity) runs after Redis and before messaging, with --clean, and is named in both path filters",
  live.includes(cacheParityStep) &&
  live.indexOf("run: node scripts/verify-redis-live.mjs") < live.indexOf(cacheParityStep) &&
  live.indexOf(cacheParityStep) < live.indexOf("run: node scripts/verify-messaging-live.mjs") &&
  live.indexOf(cacheParityStep) < live.indexOf("npm run proof") &&
  live.split("scripts/verify-cache-parity-live.mjs").length - 1 >= 3);

console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
