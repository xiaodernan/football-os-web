// M211 proof: domain/training.ts spends exactly the minutes it says it spends.
//
// Before this file, a "5-minute" session was 12 minutes of exercises, a 90-minute
// one was 35–43, and `focusAttributes` listed attributes no block trained. Three
// readers of the same session disagreed: domain/load.ts counted the exercises,
// domain/review.ts and the profile counted `targetMinutes`, and the XP curve was
// paid off `targetMinutes`. The contract pinned here is the one the app claims in
// its own header comment — a warm-up → technique → decision → game → cool-down
// session whose exercises sum to exactly the target the player picked.
import { createServer } from "vite";
import { readFileSync } from "node:fs";

let pass = 0, fail = 0;
const ok = (name, cond, detail) => {
  if (cond) { pass++; console.log("ok   " + name); }
  else { fail++; console.log("FAIL " + name + (detail ? "  — " + String(detail).slice(0, 240) : "")); }
};

const SRC = readFileSync("domain/training.ts", "utf8");
const num = (name) => {
  const m = SRC.match(new RegExp(`const ${name} = ([0-9.]+)`));
  return m ? Number(m[1]) : NaN;
};
const BOOKEND_SHARE = num("BOOKEND_SHARE");
const BOOKEND_MAX = num("BOOKEND_MAX");
const PHASE_MINUTES = num("PHASE_MINUTES");
const BLOCK_MINUTES = num("BLOCK_MINUTES");
const WEIGHTS = ((SRC.match(/const PHASE_WEIGHTS = \[([^\]]+)\]/) || [,""])[1]).split(",").map(Number);

// The drill bank, read from the same source the module compiles from — the phase
// totals below are derived from each drill's catalogue minutes, so a hand-copied
// table cannot certify this file.
const BANK = [...SRC.matchAll(
  /\{ key: "([^"]+)", label: "([^"]+)", focus: "([^"]+)", minutes: (\d+), intensity: (\d+), phase: "([^"]+)" \}/g,
)].map(([, key, label, focus, minutes, intensity, phase]) => ({
  key, label, focus, minutes: Number(minutes), intensity: Number(intensity), phase,
}));
const BY_KEY = new Map(BANK.map((d) => [d.key, d]));
const PHASE_RANK = { warmup: 0, technique: 1, decision: 2, game: 3, cooldown: 4 };

/** Split `total` over `weights` by largest remainder — the proof's own copy of the
 *  allocation the source comment describes (sums exactly, ties break to the front). */
function split(total, weights) {
  const sum = weights.reduce((s, w) => s + w, 0) || 1;
  const raw = weights.map((w) => (total * w) / sum);
  const parts = raw.map((v) => Math.floor(v));
  let rest = total - parts.reduce((s, p) => s + p, 0);
  for (const i of raw.map((v, j) => j).sort((a, b) => raw[b] - parts[b] - (raw[a] - parts[a]) || a - b)) {
    if (rest <= 0) break;
    parts[i] += 1;
    rest -= 1;
  }
  return parts;
}

/** What the budget should buy at a given target: bookend minutes, then per-phase
 *  totals and block counts. Derived from the constants above, not from buildSession. */
function expectPlan(target) {
  const bookend = Math.min(BOOKEND_MAX, Math.max(1, Math.round(target * BOOKEND_SHARE)));
  const warmup = Math.min(bookend, Math.max(0, target - 1));
  const cooldown = Math.min(bookend, Math.max(0, target - warmup - 1));
  const phase = split(target - warmup - cooldown, WEIGHTS);
  for (const i of [1, 2]) {
    if (phase[i] > 0 && phase[i] < PHASE_MINUTES) { phase[0] += phase[i]; phase[i] = 0; }
  }
  const blocks = phase.map((b) => (b > 0 ? Math.max(1, Math.round(b / BLOCK_MINUTES)) : 0));
  return { warmup, cooldown, phase: { technique: phase[0], decision: phase[1], game: phase[2] }, blocks };
}

const server = await createServer({ server: { middlewareMode: true }, appType: "custom", logLevel: "error" });
const { DICTIONARIES } = await server.ssrLoadModule("/i18n/dictionaries.ts");
function resolve(row) {
  if (Array.isArray(row)) return row.map(r => resolve(r)).join(" ");
  const tpl = DICTIONARIES.en[row.key];
  if (!tpl) return row.key;
  return Object.entries(row.vars ?? {}).reduce((s, [k, v]) => s.replaceAll(`{${k}}`, String(v)), tpl);
}
async function tryLoad(p) {
  try { return { mod: await server.ssrLoadModule(p), err: "" }; }
  catch (e) { return { mod: null, err: `${p}: ${String(e && e.message).split("\n")[0].slice(0, 140)}` }; }
}

const { mod: TR, err: trErr } = await tryLoad("/domain/training.ts");
const { mod: AT, err: atErr } = await tryLoad("/domain/attributes.ts");
if (!TR || !AT) {
  ok(`training and attributes load so this file can measure them (${trErr}${atErr})`, false);
} else {
  const { buildSession, SUPPORTED_MINUTES, sessionIntensity } = TR;
  const { ATTRIBUTE_KEYS } = AT;

  // ---- 0. the declarations this proof reads ----
  ok(`the source declares its budget constants and the reader sees them (${BOOKEND_SHARE}/${BOOKEND_MAX}/${PHASE_MINUTES}/${BLOCK_MINUTES}, weights ${WEIGHTS.join(":")})`,
    [BOOKEND_SHARE, BOOKEND_MAX, PHASE_MINUTES, BLOCK_MINUTES, ...WEIGHTS].every((n) => Number.isFinite(n)) && WEIGHTS.length === 3,
    "a renamed or inlined constant makes this proof blind");
  ok(`the drill bank reader finds every row (${BANK.length} drills, ${new Set(BANK.map((d) => d.phase)).size} phases: ${["warmup", "technique", "decision", "game", "cooldown"].map((p) => `${p}=${BANK.filter((d) => d.phase === p).length}`).join(" ")})`,
    BANK.length >= 15 && ["warmup", "technique", "decision", "game", "cooldown"].every((p) => BANK.some((d) => d.phase === p)));
  ok(`warm-up and cool-down each have exactly one drill in the bank, so a session can carry at most one of each (${BANK.filter((d) => d.phase === "warmup").length}/${BANK.filter((d) => d.phase === "cooldown").length})`,
    BANK.filter((d) => d.phase === "warmup").length === 1 && BANK.filter((d) => d.phase === "cooldown").length === 1);
  ok(`the module's SUPPORTED_MINUTES matches the source text and offers ${SUPPORTED_MINUTES.length} pickable targets (${SUPPORTED_MINUTES.join(",")})`,
    JSON.stringify(SUPPORTED_MINUTES) === JSON.stringify(((SRC.match(/SUPPORTED_MINUTES = \[([^\]]+)\]/) || [,""])[1]).split(",").map(Number)),
    "the picker and the builder would be reading different lists");
  ok(`every offered target is at least ${Math.min(...SUPPORTED_MINUTES)} minutes, so no bookend is ever squeezed out of the picker (${SUPPORTED_MINUTES.filter((m) => m < 3).length} below 3)`,
    SUPPORTED_MINUTES.every((m) => m >= 3));

  // ---- 1. the duration contract, over the whole offered surface ----
  const build = (minutes, keys, seed, roleGameFocus) =>
    buildSession({ id: `t-${keys.join("+")}-${minutes}`, date: "2026-09-12", targetMinutes: minutes, focusAttributes: keys, group: "CM", seed, roleGameFocus });
  const sum = (s) => s.exercises.reduce((n, e) => n + e.minutes, 0);

  let off = [], offCount = 0, blocksSeen = new Set(), smallest = 99, offShape = [];
  for (const minutes of SUPPORTED_MINUTES) {
    for (const key of ATTRIBUTE_KEYS) {
      for (const seed of ["a", "b", "c"]) {
        const s = build(minutes, [key], `k-${key}-${seed}`);
        if (sum(s) !== s.targetMinutes || s.targetMinutes !== minutes) { offCount++; off.push(`${minutes}/${key}/${seed}=${sum(s)}`); }
        smallest = Math.min(smallest, ...s.exercises.map((e) => e.minutes));
        for (const e of s.exercises) if (!Number.isInteger(e.minutes) || e.minutes < 1) offShape.push(`${minutes}/${key}: ${e.key}@${e.minutes}`);
        blocksSeen.add(s.exercises.length);
      }
    }
  }
  ok(`${SUPPORTED_MINUTES.length} targets × ${ATTRIBUTE_KEYS.length} attribute keys × 3 seeds = ${SUPPORTED_MINUTES.length * ATTRIBUTE_KEYS.length * 3} sessions sum to exactly the target they report (${offCount} off: ${off.slice(0, 4).join(", ") || "none"})`,
    offCount === 0);
  ok(`no block is ever allocated 0 or a fraction — every exercise is at least a whole minute (${offShape.length} violations, smallest block seen ${smallest}′; before M211 a 5-minute pick delivered 12 minutes of exercises)`,
    offShape.length === 0 && smallest >= 1);
  ok(`the session grows with the budget rather than topping out (${[...blocksSeen].sort((a, b) => a - b).join(",")} distinct block counts over the offered targets, max ${Math.max(...blocksSeen)})`,
    blocksSeen.size >= 4 && Math.max(...blocksSeen) >= 10);

  // ---- 2. allocation matches the declared shares, independently derived ----
  const allocMiss = [];
  for (const minutes of SUPPORTED_MINUTES) {
    const want = expectPlan(minutes);
    for (const seed of ["s1", "s2", "s3", "s4"]) {
      const s = build(minutes, ["passing"], seed);
      const warm = s.exercises.filter((e) => e.phase === "warmup");
      const cool = s.exercises.filter((e) => e.phase === "cooldown");
      const total = (p) => s.exercises.filter((e) => e.phase === p).reduce((n, e) => n + e.minutes, 0);
      const count = (p) => s.exercises.filter((e) => e.phase === p).length;
      if (warm.length !== (want.warmup ? 1 : 0) || total("warmup") !== want.warmup) allocMiss.push(`${minutes}/${seed} warmup ${total("warmup")}≠${want.warmup}`);
      if (cool.length !== (want.cooldown ? 1 : 0) || total("cooldown") !== want.cooldown) allocMiss.push(`${minutes}/${seed} cooldown ${total("cooldown")}≠${want.cooldown}`);
      for (const [i, p] of ["technique", "decision", "game"].entries()) {
        if (total(p) !== want.phase[p]) allocMiss.push(`${minutes}/${seed} ${p} ${total(p)}≠${want.phase[p]}`);
        if (count(p) !== want.blocks[i]) allocMiss.push(`${minutes}/${seed} ${p} blocks ${count(p)}≠${want.blocks[i]}`);
      }
      // Within a phase the minutes follow the largest remainder over the catalogue
      // durations of exactly those drills — the allocation cannot be a coincidence.
      for (const p of ["technique", "decision", "game"]) {
        const row = s.exercises.filter((e) => e.phase === p);
        if (!row.length) continue;
        const cat = row.map((e) => BY_KEY.get(e.key));
        if (cat.some((c) => !c)) {
          allocMiss.push(`${minutes}/${seed} bank reader gave ${cat.filter((c) => c).length}/${row.length} of the drills on the page`);
          continue;
        }
        const derived = split(total(p), cat.map((c) => c.minutes));
        if (row.some((e, i) => e.minutes !== derived[i])) allocMiss.push(`${minutes}/${seed} ${p} split ${row.map((e) => e.minutes).join("")}≠${derived.join("")}`);
      }
    }
  }
  ok(`the minutes land where the source's own constants say they should — bookends at ${BOOKEND_SHARE}·target capped at ${BOOKEND_MAX}′, middle split ${WEIGHTS.join(":")}, ${SUPPORTED_MINUTES.length} targets × 4 seeds (${allocMiss.length} divergences: ${allocMiss.slice(0, 3).join(" | ") || "none"})`,
    allocMiss.length === 0);
  const subBookend = SUPPORTED_MINUTES.map((m) => { const w = expectPlan(m); return `${m}=${w.warmup}+${w.cooldown}`; }).join(" ");
  ok(`the bookends stay capped, so a 90-minute session does not get a 9-minute cool-down (${subBookend})`,
    SUPPORTED_MINUTES.every((m) => { const w = expectPlan(m); return w.warmup <= BOOKEND_MAX && w.cooldown <= BOOKEND_MAX; }) && expectPlan(90).warmup === BOOKEND_MAX);
  // The header comment's "a tenth of the session each, capped at 6" is a claim about the
  // NUMBER, not only about the shape, so it is pinned as measured minutes: the model above
  // recomputes from the same constants and would follow them anywhere they were moved.
  const BOOKEND_ROW = "5=1+1 10=1+1 20=2+2 30=3+3 45=5+5 60=6+6 90=6+6";
  const measuredBookend = SUPPORTED_MINUTES.map((m) => {
    const s = build(m, ["passing"], "bk");
    const t = (p) => s.exercises.filter((e) => e.phase === p).reduce((n, e) => n + e.minutes, 0);
    return `${m}=${t("warmup")}+${t("cooldown")}`;
  }).join(" ");
  ok(`a tenth of the session each, capped at 6 minutes, is what the sessions really spend (${measuredBookend})`,
    measuredBookend === BOOKEND_ROW && subBookend === BOOKEND_ROW);

  // ---- 3. a phase is either real or absent ----
  const fakePhase = [];
  for (const minutes of [1, 2, 3, ...SUPPORTED_MINUTES, 12, 15, 24]) {
    for (const seed of ["p", "q"]) {
      const s = build(minutes, ["passing", "finishing"], seed);
      for (const p of ["technique", "decision", "game"]) {
        const total = s.exercises.filter((e) => e.phase === p).reduce((n, e) => n + e.minutes, 0);
        if (total > 0 && total < PHASE_MINUTES && p !== "technique") fakePhase.push(`${minutes}/${seed} ${p}=${total}`);
      }
      const ranks = s.exercises.map((e) => PHASE_RANK[e.phase]);
      if (ranks.some((r, i) => i && r < ranks[i - 1])) fakePhase.push(`${minutes}/${seed} order ${ranks.join("")}`);
      if (new Set(s.exercises.map((e) => e.key)).size !== s.exercises.length) fakePhase.push(`${minutes}/${seed} repeated drill`);
      if (sum(s) !== minutes) fakePhase.push(`${minutes}/${seed} sum ${sum(s)}`);
    }
  }
  ok(`a decision or game block is never smaller than ${PHASE_MINUTES}′ — the minutes fold back into the technique work the player asked for (${fakePhase.length} violations over 11 sizes × 2 seeds)`,
    fakePhase.length === 0);
  ok(`phases appear in the order the header comment claims and no drill repeats in a session (${fakePhase.filter((v) => /order|repeated/.test(v)).length} structural violations)`,
    fakePhase.filter((v) => /order|repeated/.test(v)).length === 0);

  // ---- 4. bookend presence boundaries, measured not assumed ----
  const boundary = [1, 2, 3, 4].map((m) => {
    const s = build(m, ["passing"], "b");
    return `${m}:w${s.exercises.some((e) => e.phase === "warmup") ? 1 : 0}c${s.exercises.some((e) => e.phase === "cooldown") ? 1 : 0}`;
  }).join(" ");
  ok(`below 2′ there is no room for a warm-up and below 3′ none for a cool-down, and the technique block is never the thing dropped (${boundary})`,
    boundary === "1:w0c0 2:w1c0 3:w1c1 4:w1c1");
  ok(`a 1-minute session still trains the requested attribute rather than opening with a jog (${build(1, ["passing"], "b").exercises.map((e) => `${e.key}:${e.minutes}`).join(",")})`,
    build(1, ["passing"], "b").exercises.every((e) => e.phase === "technique"));

  // ---- 5. the focus contract ----
  const focusMiss = [];
  for (const minutes of SUPPORTED_MINUTES) {
    for (const key of ATTRIBUTE_KEYS) {
      const s = build(minutes, [key], `f-${key}`);
      if (s.focusAttributes.length !== 1 || s.focusAttributes[0] !== key) focusMiss.push(`${minutes}/${key}→[${s.focusAttributes}]`);
      const hasDedicated = BANK.some((d) => d.focus === key);
      if (hasDedicated && !s.exercises.some((e) => e.focus === key)) focusMiss.push(`${minutes}/${key} claimed with no block`);
    }
  }
  ok(`every attribute key offered by the picker is trained by a single-focus session at every supported target (${ATTRIBUTE_KEYS.length} keys × ${SUPPORTED_MINUTES.length} targets, ${focusMiss.length} misses)`,
    focusMiss.length === 0);
  const titleMiss = SUPPORTED_MINUTES.flatMap((m) => ["a", "b"].map((seed) => {
    const s = build(m, ["passing", "finishing", "shooting"], seed);
    const want = `${s.focusAttributes.map((k) => AT.attributeLabel(k)).join(" + ")} session`;
    return s.title === want ? null : `${m}/${seed}: "${s.title}" ≠ "${want}"`;
  })).filter(Boolean);
  ok(`a session's title is built from the attributes it actually trains, not from everything that was asked for (${titleMiss.length} mismatches; a 5-minute three-focus pick is titled "${build(5, ["passing", "finishing", "shooting"], "a").title}")`,
    titleMiss.length === 0);

  const trimmed = SUPPORTED_MINUTES.map((m) => {
    const s = build(m, ["passing", "finishing", "shooting", "dribbling"], `trim-${m}`);
    const techBlocks = s.exercises.filter((e) => e.phase === "technique").length;
    return { m, trained: s.focusAttributes.length, techBlocks, ok: s.focusAttributes.length === Math.min(4, techBlocks) && s.focusAttributes.every((k, i) => k === ["passing", "finishing", "shooting", "dribbling"][i]) };
  });
  ok(`a tight budget drops the LATER requested focuses, in order — never the first one, never silently (${trimmed.map((t) => `${t.m}:${t.trained}/${t.techBlocks}`).join(" ")})`,
    trimmed.every((t) => t.ok) && trimmed.some((t) => t.trained < 4) && trimmed[trimmed.length - 1].trained === 4);
  ok(`focusAttributes is a subset of what was asked for and is never empty for a real session (${new Set(trimmed.map((t) => t.trained)).size} distinct trained counts over ${trimmed.length} targets)`,
    trimmed.every((t) => t.trained >= 1 && t.trained <= 4));
  const dupes = build(30, ["passing", "passing", "finishing"], "d");
  ok(`a repeated focus key is asked for twice and trained once (${JSON.stringify(dupes.focusAttributes)} from ${JSON.stringify(["passing", "passing", "finishing"])})`,
    dupes.focusAttributes.length === new Set(["passing", "passing", "finishing"]).size);
  ok(`an empty focus list falls back to a real attribute instead of an unnamed session (${JSON.stringify(build(20, [], "e").focusAttributes)})`,
    build(20, [], "e").focusAttributes.length === 1 && ATTRIBUTE_KEYS.includes(build(20, [], "e").focusAttributes[0]));

  // ---- 6. provenance: only the minutes are this session's ----
  const forged = [];
  for (const minutes of SUPPORTED_MINUTES) {
    for (const seed of ["x", "y"]) {
      const s = build(minutes, ["first_touch", "weak_foot"], seed);
      for (const e of s.exercises) {
        const bankRow = BY_KEY.get(e.key);
        if (!bankRow) { forged.push(`${minutes}/${seed}: unknown drill ${e.key}`); continue; }
        if (e.label !== bankRow.label || e.focus !== bankRow.focus || e.intensity !== bankRow.intensity || e.phase !== bankRow.phase)
          forged.push(`${minutes}/${seed}: ${e.key} off-catalogue`);
      }
    }
  }
  ok(`every block is a real catalogue drill with only its minutes scaled to the budget (${forged.length} divergences over ${SUPPORTED_MINUTES.length * 2} multi-focus sessions; ${BANK.length} catalogue rows read)`,
    forged.length === 0);

  // ---- 7. role shaping survives the new allocation ----
  const GAME_FOCUSES = ["crossing", "transition_awareness", "game_intelligence", "sprint"];
  const roleMiss = [];
  for (const gf of GAME_FOCUSES) {
    for (const minutes of SUPPORTED_MINUTES) {
      const s = build(minutes, ["passing"], `r-${gf}-${minutes}`, gf);
      const game = s.exercises.filter((e) => e.phase === "game");
      if (game.length && game[0].focus !== gf) roleMiss.push(`${gf}@${minutes}→${game[0].focus}`);
    }
  }
  ok(`whenever a session has the budget for a game block, the FIRST one is the player's role drill (${roleMiss.length} misses over ${GAME_FOCUSES.length} role focuses × ${SUPPORTED_MINUTES.length} targets; short targets have no game block at all)`,
    roleMiss.length === 0);
  ok(`the game block is genuinely absent where the budget cannot carry it — the coach may not claim one (${SUPPORTED_MINUTES.map((m) => `${m}:${build(m, ["passing"], "g", "crossing").exercises.some((e) => e.phase === "game") ? "y" : "n"}`).join("")})`,
    !build(5, ["passing"], "g", "crossing").exercises.some((e) => e.phase === "game") &&
    !build(10, ["passing"], "g", "crossing").exercises.some((e) => e.phase === "game") &&
    build(20, ["passing"], "g", "crossing").exercises.some((e) => e.phase === "game"));
  ok(`an unknown roleGameFocus leaves the game block seeded rather than dropping it (${(() => { const s = build(60, ["passing"], "u", "not_a_drill"); const g = s.exercises.filter((e) => e.phase === "game"); return g.length ? g[0].focus : "none"; })()})`,
    (() => { const g = build(60, ["passing"], "u", "not_a_drill").exercises.filter((e) => e.phase === "game"); return g.length > 0 && GAME_FOCUSES.includes(g[0].focus); })());

  // ---- 8. determinism and purity ----
  const same = ["5", "20", "45", "90"].map((m) => JSON.stringify(build(+m, ["passing", "finishing"], "seed-1")) === JSON.stringify(build(+m, ["passing", "finishing"], "seed-1")));
  ok(`the same seed and target reproduce the session byte for byte (${same.filter(Boolean).length}/${same.length} sizes)`,
    same.every(Boolean));
  const differ = new Set(Array.from({ length: 40 }, (_, i) => build(60, ["passing"], `s${i}`).exercises.map((e) => `${e.key}:${e.minutes}`).join("|"))).size;
  ok(`40 seeds at 60 minutes produce ${differ} distinct plans — the seeded pick still chooses, it does not just resize (a single fixed plan would make "shaped to you" decorative)`,
    differ >= 20);
  const input = { id: "P1", date: "2026-09-12", targetMinutes: 45, focusAttributes: ["passing", "finishing"], group: "CM", seed: "pp", roleGameFocus: "crossing" };
  const before = JSON.stringify(input);
  buildSession(input);
  ok(`buildSession does not mutate the caller's input (${before === JSON.stringify(input) ? "unchanged" : "changed"})`,
    before === JSON.stringify(input));
  ok(`the default seed (id + target) still yields a full session and sums to target (${(() => { const s = buildSession({ id: "noseed", date: "2026-09-12", targetMinutes: 30, focusAttributes: ["dribbling"], group: "WM" }); return `${sum(s)}/${s.exercises.length} blocks`; })()})`,
    (() => { const s = buildSession({ id: "noseed", date: "2026-09-12", targetMinutes: 30, focusAttributes: ["dribbling"], group: "WM" }); return sum(s) === 30 && s.exercises.length > 3; })());
  ok(`a fractional target rounds down and the session spends the rounded number, not the request (${(() => { const s = buildSession({ id: "frac", date: "2026-09-12", targetMinutes: 12.7, focusAttributes: ["passing"], group: "CM", seed: "z" }); return `${s.targetMinutes}/${sum(s)}`; })()})`,
    (() => { const s = buildSession({ id: "frac", date: "2026-09-12", targetMinutes: 12.7, focusAttributes: ["passing"], group: "CM", seed: "z" }); return s.targetMinutes === 12 && sum(s) === 12; })());

  // ---- 9. sessionIntensity still reads the blocks it is given ----
  const intenMiss = [];
  for (const minutes of SUPPORTED_MINUTES) {
    const s = build(minutes, ["sprint", "weak_foot"], "i");
    const mins = sum(s);
    const load = s.exercises.reduce((n, e) => n + e.intensity * e.minutes, 0);
    const want = Math.max(1, Math.min(5, Math.round(load / mins)));
    const got = sessionIntensity(s);
    if (got !== want || got < 1 || got > 5) intenMiss.push(`${minutes}:${got}≠${want}`);
  }
  ok(`sessionIntensity is the minute-weighted mean of the blocks actually present, in 1..5 (${intenMiss.length} divergences; ${SUPPORTED_MINUTES.map((m) => sessionIntensity(build(m, ["sprint", "weak_foot"], "i"))).join(",")})`,
    intenMiss.length === 0);
}

// ---- 10. the three readers now count the same session the same way ----
const { mod: LD, err: ldErr } = await tryLoad("/domain/load.ts");
const { mod: RV, err: rvErr } = await tryLoad("/domain/review.ts");
const { mod: XP, err: xpErr } = await tryLoad("/domain/xp.ts");
if (!TR || !LD || !RV || !XP) ok(`load, review and xp all load so the readers can be cross-checked (${ldErr}${rvErr}${xpErr})`, false);
else {
  const NOW = Date.parse("2026-09-22T12:00:00Z");
  const s = {
    ...TR.buildSession({ id: "XR", date: new Date(NOW - 3600e3).toISOString(), targetMinutes: 5, focusAttributes: ["passing"], group: "CM", seed: "xr" }),
    status: "completed", completedAt: new Date(NOW - 3600e3).toISOString(), selfRating: 3,
  };
  const exMinutes = s.exercises.reduce((n, e) => n + e.minutes, 0);
  const loadMinutes = LD.buildLoad({ nowMs: NOW, sessions: [s] }).weekLoad;
  const reviewMinutes = RV.buildReview({ nowMs: NOW, windowDays: 7, sessions: [s], goals: [], progress: [], attributes: {}, streak: 0 }).minutes;
  const intensity = TR.sessionIntensity(s);
  const xpMinutes = XP.xpForSession({ minutes: s.targetMinutes, intensity, selfRating: 3, focusCount: s.focusAttributes.length });
  ok(`one completed 5-minute session is 5 minutes to all three readers — exercise sum ${exMinutes}, weekly review ${reviewMinutes}, load model weekLoad ${loadMinutes} = 5′ × RPE 3 (before M211 this same session was 12 minutes of exercises, so the ACWR that caps the coach ran 2.4× hot while the review counted 5)`,
    exMinutes === 5 && reviewMinutes === 5 && loadMinutes === Math.round(5 * 3));
  ok(`the XP paid for that session is the formula over its own target (${xpMinutes} = xpForSession{minutes:${s.targetMinutes},intensity:${intensity},rating:3,focus:${s.focusAttributes.length}})`,
    xpMinutes === XP.xpForSession({ minutes: exMinutes, intensity, selfRating: 3, focusCount: s.focusAttributes.length }) && xpMinutes > 0);
  const allShort = [5, 10].flatMap((m) => ["a", "b"].map((seed) => {
    const x = TR.buildSession({ id: `S${m}${seed}`, date: new Date(NOW - 7200e3).toISOString(), targetMinutes: m, focusAttributes: ["passing", "finishing"], group: "CM", seed });
    return { ...x, status: "completed", completedAt: new Date(NOW - 7200e3).toISOString(), selfRating: 3 };
  }));
  const load2 = LD.buildLoad({ nowMs: NOW, sessions: allShort }).weekLoad;
  const review2 = RV.buildReview({ nowMs: NOW, windowDays: 7, sessions: allShort, goals: [], progress: [], attributes: {}, streak: 0 }).minutes;
  const manual = allShort.reduce((n, x) => n + Math.round(x.targetMinutes * 3), 0);
  ok(`${allShort.length} short sessions add to ${review2} minutes in the weekly review and ${load2} in the load model, and ${manual} is what 5+5+10+10 × RPE 3 says (${allShort.map((x) => `${x.id}=${x.exercises.reduce((n, e) => n + e.minutes, 0)}`).join(" ")})`,
    review2 === 30 && load2 === manual && manual === 90);
}

// ---- 11. the coach's prose claims only blocks its session really carries ----
const AISRC = readFileSync("data/ai.ts", "utf8");
const { mod: AI, err: aiErr } = await tryLoad("/data/ai.ts");
if (!TR || !AT || !AI) ok(`the coach provider loads so its claims can be checked against its own sessions (${aiErr})`, false);
else {
  const mkProfile = (attributes) => ({
    displayName: "Proof", mode: "PLAYER", positionGroup: "MF", position: "CM", ageGroup: "U18",
    goal: "Improve", favoriteClubId: null, favoritePlayerId: null, favoriteCompetitionId: null,
    attributes, xp: 100, level: 2, createdAt: new Date(0).toISOString(),
  });
  const attrs = { passing: 40, finishing: 42, shooting: 44, first_touch: 70, composure: 72, strength: 60 };
  const asks = ["passing", "finishing", "shooting"];
  const plan = (availableMinutes, load) =>
    AI.coachProvider.generatePlan({ prompt: "improve my game", profile: mkProfile(attrs), history: [], availableMinutes, focusKeys: asks, load });
  const CLAIMS = [
    ["warm-up", /Warm-up activates movement/i],
    ["decision", /decision-making block/i],
    ["game", /game-realistic block is your/i],
    ["role-shaped", /session shaped to your role/i],
  ];
  const said = (p) => CLAIMS.filter(([, re]) => p.rationale.some((r) => re.test(resolve(r)))).map(([n]) => n);
  const phases = (p) => p.session.exercises.map((e) => e.phase);
  const short = await plan(5);
  const long = await plan(60);
  // A claim is owed exactly when its block exists: the warm-up survives a 5-minute
  // budget (it is 1 minute of it), the decision and game blocks do not.
  const owes = (p) => {
    const has = (ph) => phases(p).includes(ph);
    return CLAIMS.filter(([n]) => (n === "warm-up" ? has("warmup") : n === "decision" ? has("decision") : has("game"))).map(([n]) => n);
  };
  const diff = [short, long].flatMap((p) => {
    const o = owes(p), s = said(p);
    return [
      ...s.filter((n) => !o.includes(n)).map((n) => `${p.session.targetMinutes}′ claims ${n} with no block`),
      ...o.filter((n) => !s.includes(n)).map((n) => `${p.session.targetMinutes}′ omits ${n} though the block exists`),
    ];
  });
  ok(`every block sentence the coach writes has a block behind it, and every block has its sentence (${short.session.targetMinutes}′ blocks ${phases(short).join(",")} says [${said(short).join(",")}]; ${long.session.targetMinutes}′ blocks ${phases(long).join(",")} says [${said(long).join(",")}]; ${diff.length} divergences: ${diff.slice(0, 2).join(" | ") || "none"})`,
    diff.length === 0);
  ok(`the short plan's silence is a real budget fact, not a blanket suppression (no decision/game block at 5′: ${["decision", "game"].filter((p) => !phases(short).includes(p)).length === 2}, while 60′ carries all ${owes(long).length} claims)`,
    !phases(short).includes("decision") && !phases(short).includes("game") && owes(long).length === CLAIMS.length && said(long).length === CLAIMS.length);
  const shortSentence = (resolve(short.diagnosis).match(/has room for ([^,]+), so it starts there/) || [])[1];
  const named = shortSentence ? shortSentence.split(" and ").map((s) => s.trim()) : [];
  const trainedLabels = short.focus.map(AT.attributeLabel);
  ok(`when the flagged priorities do not fit, the diagnosis names the one it starts with and nothing else (says "${named.join(" and ")}" for a plan that trains ${trainedLabels.join(" and ")})`,
    named.length > 0 && named.length === trainedLabels.length && named.every((l, i) => l === trainedLabels[i]));
  ok(`a plan's focus is exactly the attributes its own session trains (asked ${asks.length} → ${short.focus.length} at 5′, ${long.focus.length} at 60′, and ${resolve(long.diagnosis).includes("built around exactly those") ? "60′ claims the whole ask" : "60′ declines the whole ask"})`,
    JSON.stringify(short.focus) === JSON.stringify(short.session.focusAttributes) &&
    JSON.stringify(long.focus) === JSON.stringify(long.session.focusAttributes) &&
    long.focus.length === long.session.focusAttributes.length &&
    short.focus.length < asks.length && long.focus.length === asks.length - 1 &&
    resolve(long.diagnosis).includes("built around exactly those"));
  // The coach re-keys the offered lengths into its own table; if the two lists drift,
  // a picker value silently becomes a different session than the builder was asked for.
  const clampTable = ((AISRC.match(/const opts = \[([0-9, ]+)\]/) || [, ""])[1]).split(",").map(Number);
  const offered = TR.SUPPORTED_MINUTES;
  ok(`the coach clamps session length onto the same list the picker offers (${clampTable.join(",")} vs ${offered.join(",")})`,
    clampTable.length === offered.length && JSON.stringify(clampTable) === JSON.stringify([...offered]));
  const coachMiss = [];
  for (const minutes of [5, 20, 60]) for (const load of [undefined, { zone: "high", acwr: 1.6, weekLoad: 300 }, { zone: "caution", acwr: 1.3, weekLoad: 250 }]) {
    const p = await plan(minutes, load);
    const s = p.session.exercises.reduce((n, e) => n + e.minutes, 0);
    if (s !== p.session.targetMinutes) coachMiss.push(`${minutes}/${load?.zone ?? "none"}=${s}≠${p.session.targetMinutes}`);
    if (!p.focus.length || p.focus.some((k) => !p.session.exercises.some((e) => e.focus === k))) coachMiss.push(`${minutes}/${load?.zone ?? "none"} focus`);
  }
  ok(`every session the coach hands back spends the minutes it reports and trains every attribute it names (${coachMiss.length} breaks over 9 budget × load-zone combinations)`,
    coachMiss.length === 0);
}

await server.close();
console.log(`\n${pass}/${pass + fail} checks passed`);
process.exit(fail ? 1 : 0);
