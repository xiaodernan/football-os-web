// Proof for the ⌘K affordance — the badge, the button that carries it, and the one open state.
//
// The defect, measured before it was fixed. The header carried a `<kbd>⌘K</kbd>` badge on a
// button whose onClick was `navigate("/search")`, while the ⌘K key itself was bound inside
// CommandPalette to a dialog that ALSO searches (its own CommandInput over globalSearch). So the
// machine said one thing and the mouse another: press the key, you get the palette; click the
// badge that names that very key, you get a different surface. Both surfaces are real and both
// stay — this unit moves no page, it moves the promise.
//
// The repair. The shell owns the palette's open state and the badge's button opens the palette,
// so the badge and the shortcut drive one control. `/search` keeps its own reader: the sidebar's
// nav item (AppShell.tsx) and the route (FootballWorld.tsx) are both charged below, because a
// fix that orphaned a screen would be a second defect wearing the first one's clothes.
//
// Every zero here carries its plant. The census asserts "the palette declares no open state of
// its own" and "no control navigates to /search from a badge" — both read 0 on a tree that simply
// stopped containing those shapes, so each clause plants the pre-fix spelling and requires the
// reader to find exactly one of it. The proof-i18n vacuity census charges a zero-asserting clause
// with no device, so this file is written to be read by that gate as well as by a person.
//
// Run: node scripts/proof-command-entry.mjs
import { createServer } from "vite";
import { readFileSync, readdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const server = await createServer({
  cacheDir: join(tmpdir(), `proof-command-entry-vite-${process.pid}`),
  server: { middlewareMode: true },
  appType: "custom",
  logLevel: "error",
  optimizeDeps: { noDiscovery: true, include: [] },
});

let pass = 0, fail = 0;
const ok = (name, cond) => { if (cond) { pass++; console.log("ok   " + name); } else { fail++; console.log("FAIL " + name); } };

const SHELL = "features/shell/AppShell.tsx";
const PALETTE = "features/command/CommandPalette.tsx";
const WORLD = "features/football/FootballWorld.tsx";

// The badge, and the two shapes a badge's button can have.
const KBD_BADGE = /<kbd[^>]*>⌘K<\/kbd>/g;
const OPENS_PALETTE = /onClick=\{\(\)\s*=>\s*setPaletteOpen\(true\)\}/g;
const GOES_SEARCH = /onClick=\{\(\)\s*=>\s*navigate\("\/search"\)\}/g;
// One open state, held by the shell, handed to the palette as props.
const SHELL_STATE = /const \[paletteOpen,\s*setPaletteOpen\]\s*=\s*useState\(false\)/g;
const CONTROLLED = /<CommandPalette\s+open=\{paletteOpen\}\s+onOpenChange=\{setPaletteOpen\}\s*\/>/g;
const PALETTE_PROPS = /export function CommandPalette\(\{ open, onOpenChange \}/g;
const OWN_STATE = /const \[open,\s*setOpen\]\s*=\s*useState\(/g;
// The shortcut: one binding, and it toggles the OWNER's state rather than a private one.
const KEYDOWN_K = /\(e\.metaKey \|\| e\.ctrlKey\) && e\.key\.toLowerCase\(\) === "k"/g;
const TOGGLES_OWNER = /onOpenChange\(\(o\) => !o\)/g;
const TOGGLES_OWN = /setOpen\(\(o\) => !o\)/g;
// The surface the badge used to send the mouse to, and the readers that keep it alive.
const NAV_SEARCH = /\{\s*to: "\/search",[^\n]*label: t\("nav\.search"\)/g;
const ROUTE_SEARCH = /matchRoute\("\/search", path\)/g;
const RENDERS_SEARCH = /return <SearchPage \/>/g;
// The palette's own promise: a bound input over the debounced query, into the shipped search.
const BOUND_INPUT = /<CommandInput[^>]*value=\{query\}[^>]*onValueChange=\{setQuery\}/g;
const SEARCHES_DEBOUNCED = /globalSearch\(dq/g;
const SEARCHES_RAW = /globalSearch\(query/g;

const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(`${d}/${e.name}`) : [`${d}/${e.name}`]);
const carriers = ["domain", "data", "lib", "features", "components", "ui", "src", "store", "i18n"]
  .filter((d) => { try { readdirSync(d); return true; } catch { return false; } })
  .flatMap(walk).filter((f) => /\.(ts|tsx)$/.test(f));
const raw = Object.fromEntries(carriers.map((f) => [f, readFileSync(f, "utf8")]));
const n = (text, re) => (text.match(re) || []).length;
const has = (p) => Object.prototype.hasOwnProperty.call(raw, p);

// --- 1. Every scan is armed, and a badge on a control that is not a button reads as no opener. ---
const plantBadge = n('<kbd className="x">⌘K</kbd>', KBD_BADGE);
const plantOpens = n('onClick={() => setPaletteOpen(true)}', OPENS_PALETTE);
const plantGoes = n('onClick={() => navigate("/search")}', GOES_SEARCH);
const plantOwnState = n('  const [open, setOpen] = useState(false);\n', OWN_STATE);
const plantControlled = n('<CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />', CONTROLLED);
const plantKeydown = n('if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {', KEYDOWN_K);
const plantTogglesOwner = n('onOpenChange((o) => !o);', TOGGLES_OWNER);
const plantTogglesOwn = n('setOpen((o) => !o);', TOGGLES_OWN);
const plantBadgeNoOpener = n('<button type="button"><kbd>⌘K</kbd></button>', OPENS_PALETTE);
ok(`the seven scans are armed and a badge with no handler is not credited as an opener (badge ${plantBadge}, opens ${plantOpens}, goes-search ${plantGoes}, own-state ${plantOwnState}, controlled ${plantControlled}, keydown ${plantKeydown}, toggles-owner ${plantTogglesOwner} vs toggles-own ${plantTogglesOwn}; a bare badge reads ${plantBadgeNoOpener} openers)`,
  plantBadge === 1 && plantOpens === 1 && plantGoes === 1 && plantOwnState === 1 && plantControlled === 1 &&
  plantKeydown === 1 && plantTogglesOwner === 1 && plantTogglesOwn === 1 && plantBadgeNoOpener === 0);

// --- 2. The census walks the real tree, and every subject it charges is inside it. ---
const subjects = [SHELL, PALETTE, WORLD].filter((p) => !has(p));
ok(`the walk found the real source tree and every subject is in it (${carriers.length} .ts/.tsx, floor 90; missing [${subjects.join(",")}], planted missing-file read ${subjects.length ? 1 : 0})`,
  carriers.length >= 90 && subjects.length === 0);

// --- 3. THE BADGE'S OWN BUTTON opens the palette. Read structurally: the <kbd> line is walked up ---
// --- to the <Button that carries it and down to its </Button>, so the claim is about the control ---
// --- the reader sees, not about two lines that happen to share a file. ---
const shellLines = raw[SHELL].split(/\r?\n/);
const kbdIdx = shellLines.findIndex((l) => n(l, KBD_BADGE) > 0);
let btnStart = kbdIdx; while (btnStart >= 0 && !/<Button\b/.test(shellLines[btnStart])) btnStart--;
let btnEnd = kbdIdx; while (btnEnd < shellLines.length && !/<\/Button>/.test(shellLines[btnEnd])) btnEnd++;
const badgeBlock = btnStart >= 0 && btnEnd < shellLines.length && kbdIdx >= 0
  ? shellLines.slice(btnStart, btnEnd + 1).join("\n") : "";
const blockIsButton = /<Button\b/.test(badgeBlock) && /<\/Button>/.test(badgeBlock);
const badgeOpens = n(badgeBlock, OPENS_PALETTE);
const badgeGoes = n(badgeBlock, GOES_SEARCH);
// The pre-fix block, byte for byte, on the same reader: it must read 0 openers and 1 navigation,
// otherwise clause 3 is only proving that the file changed, not that the shape is what it names.
const preFixBlock = '<Button\n  variant="outline"\n  onClick={() => navigate("/search")}\n>\n  <span>⌕</span>\n  <kbd className="ml-auto hidden">⌘K</kbd>\n</Button>';
const preFixOpens = n(preFixBlock, OPENS_PALETTE);
const preFixGoes = n(preFixBlock, GOES_SEARCH);
ok(`the button that carries the ⌘K badge opens the palette and navigates nowhere (badge line ${kbdIdx + 1}, block ${btnStart + 1}-${btnEnd + 1} of ${shellLines.length}, is a Button ${blockIsButton ? 1 : 0}, opens ${badgeOpens}, navigates ${badgeGoes}; the planted pre-fix block reads ${preFixOpens} opens / ${preFixGoes} navigations)`,
  kbdIdx >= 0 && blockIsButton && badgeOpens === 1 && badgeGoes === 0 && preFixOpens === 0 && preFixGoes === 1);

// --- 4. One open state, and it belongs to the shell. A palette that keeps its own state would ---
// --- compile, pass clause 3's text, and still not open when the button is pressed. ---
const shellState = n(raw[SHELL], SHELL_STATE);
const shellControlled = n(raw[SHELL], CONTROLLED);
const paletteProps = n(raw[PALETTE], PALETTE_PROPS);
const paletteOwnState = n(raw[PALETTE], OWN_STATE);
ok(`the shell owns the single open state and hands it down (shell state ${shellState}, mount passing both props ${shellControlled}, palette's props signature ${paletteProps}, palette's own state ${paletteOwnState}; planted own-state read ${plantOwnState})`,
  shellState === 1 && shellControlled === 1 && paletteProps === 1 && paletteOwnState === 0);

// --- 5. The shortcut is bound exactly once tree-wide, and it toggles the owner's state. ---
const keydownByFile = carriers.filter((f) => n(raw[f], KEYDOWN_K) > 0);
const keydownTotal = carriers.reduce((s, f) => s + n(raw[f], KEYDOWN_K), 0);
const togglesOwner = n(raw[PALETTE], TOGGLES_OWNER);
const togglesOwn = n(raw[PALETTE], TOGGLES_OWN);
ok(`⌘K is bound once, in the palette, and the handler flips the shell's state (${keydownTotal} bindings over [${keydownByFile.join(",")}], floor 1; toggles-owner ${togglesOwner}, toggles-own ${togglesOwn}; planted handler read ${plantTogglesOwner} / ${plantTogglesOwn})`,
  keydownTotal === 1 && keydownByFile.length === 1 && keydownByFile[0] === PALETTE && togglesOwner === 1 && togglesOwn === 0);

// --- 6. /search did not lose its way in. The badge stopped being its door, so the census charges ---
// --- the doors that remain: the sidebar item and the route. A fix that orphaned the screen would ---
// --- read 0 here, and 0 on a screen still linked from two places is a reader that broke. ---
const navSearch = n(raw[SHELL], NAV_SEARCH);
const routeSearch = n(raw[WORLD], ROUTE_SEARCH);
const rendersSearch = n(raw[WORLD], RENDERS_SEARCH);
const plantNav = n('const search: NavItem[] = [{ to: "/search", label: t("nav.search"), icon: I.search }];', NAV_SEARCH);
const plantNoNav = n('const search: NavItem[] = [{ to: "/settings", label: t("nav.settings") }];', NAV_SEARCH);
const badgeNavigatesTree = carriers.reduce((s, f) => s + n(raw[f], GOES_SEARCH), 0);
ok(`/search keeps two readers and no badge sends the mouse there any more (sidebar item ${navSearch}, route ${routeSearch}, screen rendered ${rendersSearch}; planted sidebar read ${plantNav}, planted absent sidebar read ${plantNoNav}; tree-wide navigate-to-/search from a button ${badgeNavigatesTree})`,
  navSearch === 1 && routeSearch === 1 && rendersSearch === 1 && plantNav === 1 && plantNoNav === 0 && badgeNavigatesTree === 0);

// --- 7. The shipped components, loaded: the palette cannot open itself. A zero-argument export ---
// --- would mean the state is back inside it, which is the defect clause 4 reads the source for. ---
const PAL = await server.ssrLoadModule("/features/command/CommandPalette.tsx");
const SHL = await server.ssrLoadModule("/features/shell/AppShell.tsx");
const arity = (f) => (typeof f === "function" ? f.length : -1);
const plantArityOne = ((a) => a).length;
const plantArityZero = (() => 0).length;
ok(`the palette is loaded as a component that takes its owner's state (CommandPalette is a function of ${arity(PAL.CommandPalette)} argument, AppShell of ${arity(SHL.AppShell)}; a props-less form would read ${plantArityZero} and the plant of a one-argument form reads ${plantArityOne})`,
  typeof PAL.CommandPalette === "function" && arity(PAL.CommandPalette) === 1 &&
  typeof SHL.AppShell === "function" && arity(SHL.AppShell) === 1);

// --- 8. The badge's label promises a search, so the palette must still be one: an input bound to ---
// --- the query, feeding the shipped global search through the debounce the rest of the app uses. ---
const boundInput = n(raw[PALETTE], BOUND_INPUT);
const searchesDebounced = n(raw[PALETTE], SEARCHES_DEBOUNCED);
const searchesRaw = n(raw[PALETTE], SEARCHES_RAW);
const plantBound = n('<CommandInput placeholder={p} value={query} onValueChange={setQuery} />', BOUND_INPUT);
const plantUnbound = n('<CommandInput placeholder={p} defaultValue="" />', BOUND_INPUT);
ok(`the palette is a search, not only a launcher (input bound to the query ${boundInput}, globalSearch fed by the debounced value ${searchesDebounced}, by the raw value ${searchesRaw}; planted bound read ${plantBound}, planted unbound read ${plantUnbound})`,
  boundInput === 1 && searchesDebounced === 1 && searchesRaw === 0 && plantBound === 1 && plantUnbound === 0);

// --- 9. One badge, one mount. A second ⌘K affordance elsewhere would re-open the same ambiguity ---
// --- this unit exists to close, so the census counts the glyph and the mount site tree-wide. ---
const badgeTotal = carriers.reduce((s, f) => s + n(raw[f], KBD_BADGE), 0);
const mountTotal = carriers.reduce((s, f) => s + n(raw[f], /<CommandPalette\b/g), 0);
const doubledBadge = n(raw[SHELL] + raw[SHELL], KBD_BADGE);
const doubledMount = n(raw[SHELL] + raw[SHELL], /<CommandPalette\b/g);
ok(`the ⌘K badge appears once and the palette is mounted once (${badgeTotal} badges, ${mountTotal} mounts; the same file counted twice reads ${doubledBadge} / ${doubledMount}, so the reader sums rather than answers "is there any")`,
  badgeTotal === 1 && mountTotal === 1 && doubledBadge === 2 && doubledMount === 2);

// --- 10. No copy moved: every literal key the two touched files read still exists in all three ---
// --- locales. The unit claims it changed a handler, not a sentence, and this is where a new ---
// --- string that only exists in English would be caught. ---
const DICT = await server.ssrLoadModule("/i18n/dictionaries.ts");
const LOCALE_IDS = DICT.LOCALES ? DICT.LOCALES.map((l) => l.id) : ["en", "zh-CN", "zh-TW"];
const readKeys = (text) => [...text.matchAll(/\bt\(\s*"([a-zA-Z0-9._]+)"/g)].map((m) => m[1]);
const keys = [...new Set(readKeys(raw[SHELL]).concat(readKeys(raw[PALETTE])))].sort();
const missing = [];
for (const loc of LOCALE_IDS) {
  const table = DICT.DICTIONARIES[loc];
  for (const k of keys) if (!table || table[k] === undefined) missing.push(`${k}@${loc}`);
}
const plantMissing = DICT.DICTIONARIES["en"]["nav.searchCta"] === undefined ? 1 : 0;
const plantGhost = "cmd.this.key.does.not.exist";
const ghostMissing = LOCALE_IDS.filter((loc) => DICT.DICTIONARIES[loc][plantGhost] === undefined).length;
ok(`the two files read ${keys.length} literal keys (floor 30) and all ${LOCALE_IDS.length} locales hold every one of them (missing ${missing.length}${missing.length ? ` [${missing.join(",")}]` : ""}; a key the census invents is missing from ${ghostMissing} of ${LOCALE_IDS.length}, the badge's own key missing from ${plantMissing})`,
  keys.length >= 30 && LOCALE_IDS.length === 3 && missing.length === 0 && ghostMissing === 3 && plantMissing === 0);

// --- 11. The command primitives have one reader. The shell used to import `Command` while rendering ---
// --- no command surface: once the badge opened a palette it did not own, that import was the residue ---
// --- of the mouse-vs-keyboard split this unit closes. A second importer would mean the dialog's parts ---
// --- are being assembled somewhere other than the one controlled surface, which is the split again. ---
const COMMAND_IMPORT = /from ["']@\/components\/ui\/command["']/g;
const importByFile = carriers.filter((f) => n(raw[f], COMMAND_IMPORT) > 0);
const plantShellImport = n('import { Command } from "@/components/ui/command";', COMMAND_IMPORT);
const plantPaletteImport = n('} from "@/components/ui/command";', COMMAND_IMPORT);
const plantOtherModule = n('import { Button } from "@/components/ui/button";', COMMAND_IMPORT);
ok(`the command primitives have exactly one reader — the palette itself (${importByFile.length} importer(s) [${importByFile.join(",")}]; planted a shell-style import reads ${plantShellImport}, the palette's multiline form reads ${plantPaletteImport}, a different module reads ${plantOtherModule})`,
  importByFile.length === 1 && importByFile[0] === PALETTE &&
  plantShellImport === 1 && plantPaletteImport === 1 && plantOtherModule === 0);

console.log(`\n${pass}/${pass + fail} checks passed`);
await server.close();
process.exit(fail ? 1 : 0);
