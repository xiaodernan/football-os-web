import io
p = "scripts/proof-opstrend.mjs"
s = io.open(p, encoding="utf-8").read()
old = '''// The screen reads the catalogue and every key is trilingual with agreeing placeholders.
const screen = readFileSync(join(process.cwd(), "features/ops/Ops.tsx"), "utf8");
const keys = [...new Set([...screen.matchAll(/t\\("(ops\\.trend\\.[a-zA-Z]+)"/g)].map((x) => x[1]))];
ok(`the panel's ${keys.length} labels are dictionary keys in all three locales with agreeing placeholders (${keys.join(",")})`,
  keys.length >= 8 && keys.every((k) => locales.every((l) => typeof D[l][k] === "string")) &&
  keys.every((k) => {
    const vars = (v) => (v.match(/\\{(\\w+)\\}/g) ?? []).sort().join(",");
    return locales.every((l) => vars(D[l][k]) === vars(D.en[k]));
  }) && screen.includes("trendRead("));'''
new = '''// The screen reads the catalogue: the static labels in full, and the advice codes through the
// two dynamic prefixes whose value space is the domain's own union — every code keyed in every
// locale, placeholders agreeing, exactly as the i18n gate's dynamic-site rule demands.
const screen = readFileSync(join(process.cwd(), "features/ops/Ops.tsx"), "utf8");
const keys = [...new Set([...screen.matchAll(/t\\("(ops\\.trend\\.[a-zA-Z]+)"/g)].map((x) => x[1]))];
const vars = (v) => (v.match(/\\{(\\w+)\\}/g) ?? []).sort().join(",");
const adviceCodes = ["onboarding", "navigation", "content", "engagement", "healthy"];
const adviceKeys = adviceCodes.flatMap((c) => [`ops.trend.advice.${c}`, `ops.trend.advice.${c}.note`]);
ok(`the panel's ${keys.length} static labels are dictionary keys in all three locales with agreeing placeholders (${keys.join(",")})`,
  keys.length >= 4 && keys.every((k) => locales.every((l) => typeof D[l][k] === "string")) &&
  keys.every((k) => locales.every((l) => vars(D[l][k]) === vars(D.en[k]))) && screen.includes("trendRead("));
ok(`the ${adviceKeys.length} advice keys behind the two dynamic prefixes are keyed in every locale with agreeing placeholders`,
  adviceKeys.every((k) => locales.every((l) => typeof D[l][k] === "string" && D[l][k].trim().length > 0)) &&
  adviceKeys.every((k) => locales.every((l) => vars(D[l][k]) === vars(D.en[k]))));'''
assert old in s, "anchor"
s = s.replace(old, new, 1)
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("rewritten")
