import { readFileSync } from "fs";
import { execSync } from "child_process";

const files = execSync("git diff --name-only features/").toString().trim().split("\n").filter(Boolean);
for (const f of files) {
  const s = readFileSync(f, "utf8");
  const chip = /import[^;]*CHIP_CLASS[^;]*from ["']@\/ui\/primitives["']/.test(s);
  const cn = /import[^;]*\bcn\b[^;]*from ["']@\/lib\/utils["']/.test(s);
  console.log(`${chip ? "OK " : "NO "} ${cn ? "OK " : "NO "} ${f}`);
}
