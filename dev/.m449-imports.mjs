import { readFileSync } from "fs";
import { execSync } from "child_process";

const files = execSync("git ls-files components ui features").toString().trim().split("\n");
console.log("files importing @/ui/primitives:");
for (const f of files) {
  const s = readFileSync(f, "utf8");
  if (/from ["']@\/ui\/primitives["']/.test(s)) console.log("  " + f);
}
console.log("\ncomponents/ui contents:");
console.log(execSync("git ls-files components/ui").toString().trim());
