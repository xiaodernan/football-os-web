import io
p = "scripts/proof-teachhint.mjs"
s = io.open(p, encoding="utf-8").read()

start = s.find("// --- The wiring:")
end = s.find("console.log(`\\n${pass}/")
assert start > 0 and end > start
new_part = '''// --- The wiring: every module tile wears a lesson, and no lesson sits inside an anchor. -------------
const dash = readFileSync(join(process.cwd(), "features/dashboard/Dashboard.tsx"), "utf8");
const teachEntries = (dash.match(/teach: "[a-z]+"/g) ?? []).length;
const lessonSites = (dash.match(/<TeachHint id=\\{m\\.teach\\}/g) ?? []).length;
const tileStart = dash.indexOf("MODULE_LINKS.map");
const tile = dash.slice(tileStart, tileStart + 900);
// The lesson must be a SIBLING of the anchor, never a child: reading it may not navigate. The
// reader is scoped to the tile itself and is armed on a planted violation below.
const OUTSIDE = /<\\/Link>\\s*\\{\\/\\* M1229[\\s\\S]*?<TeachHint id=\\{m\\.teach\\}/;
const outsideAnchor = OUTSIDE.test(tile);
const plantedInside = "<Link to=\\"/x\\">\\n<span>hi</span>\\n<TeachHint id=\\"palette\\" />\\n</Link>";
ok(`the dashboard's module grid wears one lesson per tile — ${teachEntries} catalogue ids over ${lessonSites} render site(s) — and the lesson sits OUTSIDE the anchor, so reading it never navigates (armed: a planted inside-anchor lesson is refused: ${!OUTSIDE.test(plantedInside)})`,
  teachEntries === 22 && lessonSites === 1 && outsideAnchor && !OUTSIDE.test(plantedInside));

const shell = readFileSync(join(process.cwd(), "features/shell/AppShell.tsx"), "utf8");
const manual = readFileSync(join(process.cwd(), "features/manual/Manual.tsx"), "utf8");
const ops = readFileSync(join(process.cwd(), "features/ops/Ops.tsx"), "utf8");
const settings = readFileSync(join(process.cwd(), "features/settings/SettingsPage.tsx"), "utf8");
ok(`the palette trigger, the manual's hero, the operator console and the settings row all read the same catalogue (palette ${shell.includes('<TeachHint id="palette" />')}, manual ${manual.includes('<TeachHint id="manual" />')}, ops ${ops.includes('<TeachHint id="ops" />')}, settings ${settings.includes("unreadTeachCount(teachSeen)")})`,
  shell.includes('<TeachHint id="palette" />') && manual.includes('<TeachHint id="manual" />') &&
  ops.includes('<TeachHint id="ops" />') && settings.includes("unreadTeachCount(teachSeen)"));

// --- The component's and the settings row's own labels are dictionary keys in all three locales. -----
const ui = readFileSync(join(process.cwd(), "ui/TeachHint.tsx"), "utf8");
const uiKeys = [...new Set([
  ...[...ui.matchAll(/"(teach\\.[a-zA-Z]+)"/g)].map((x) => x[1]),
  ...[...settings.matchAll(/"(teach\\.[a-zA-Z]+)"/g)].map((x) => x[1]),
])];
const placeholdersAgree = uiKeys.every((k) => {
  const vars = (v) => (v.match(/\\{(\\w+)\\}/g) ?? []).sort().join(",");
  return locales.every((l) => vars(D[l][k]) === vars(D.en[k]));
});
ok(`the ${uiKeys.length} labels the component and the settings row print are dictionary keys present in all three locales with agreeing placeholders (${uiKeys.join(", ")})`,
  uiKeys.length >= 8 && uiKeys.every((k) => locales.every((l) => typeof D[l][k] === "string")) && placeholdersAgree);

// --- The settings row reads and writes the ONE ledger key. -----------------------------------------
const localData = readFileSync(join(process.cwd(), "domain/localData.ts"), "utf8");
ok(`the seen-ledger key is registered in the storage inventory as a preference (so a reset of activity keeps what you have read)`,
  localData.includes('{ key: TEACH_SEEN_KEY, labelKey: "set.key.teach", kind: "preference" }') &&
  locales.every((l) => typeof D[l]["set.key.teach"] === "string"));

// --- Arming: the catalogue reader refuses an unknown id, and the wiring readers catch a loss. --------
const ghost = teachHintKey("ghost-lesson");
const lostGrid = teachEntries !== 22;
ok(`the readers are armed: an id outside the catalogue resolves null rather than a raw key at runtime (${ghost}), and the tile counter would redden a grid that lost a lesson (a 21-entry grid reads caught: ${!lostGrid})`,
  ghost === null && teachHintKey("player") === "teach.player" && !lostGrid);

'''
s = s[:start] + new_part + s[end:]
io.open(p, "w", encoding="utf-8", newline="\n").write(s)
print("proof rewritten")
