import type { Attributes, CoachPlan, UserProfile } from "@/domain/types";
import { asRowText, rowLine, type RowText } from "@/domain/rowText";
import { attributeLabel, weakestAttributes, strongestAttributes, ATTRIBUTE_KEYS, overallRating } from "@/domain/attributes";
import { buildSession } from "@/domain/training";
import { computeDna, archetypeLabelEn } from "@/domain/playerDna";
import { englishWord } from "@/i18n/format";
import { buildLoad, type LoadZone } from "@/domain/load";
import { makeRng, hashString } from "@/lib/rng";
import { newId } from "@/lib/ids";

// ---- Provider abstraction (spec §6, §50, §57) ----
// The system is never hard-wired to one model. Today we ship a deterministic
// in-process provider (Demo Mode). A real Cloud-Agent provider plugs in here.

export interface CoachProvider {
  id: string;
  available: boolean;
  generatePlan(input: PlanInput): Promise<CoachPlan>;
}

export interface LoadContext {
  zone: LoadZone;
  acwr: number | null;
  weekLoad: number;
}

export interface PlanInput {
  prompt: RowText;
  profile: UserProfile;
  history: { focus: string; completed: number }[];
  availableMinutes: number;
  load?: LoadContext;
  focusKeys?: string[]; // explicit target attributes (e.g. role-gap priorities); overrides inferred focus
  lastFocus?: string[]; // focus of the most recent stored plan — lets the coach continue vs rotate
}

const ATTRIBUTE_HINTS: [RegExp, string][] = [
  [/first ?touch|控制|停球|一脚触/i, "first_touch"],
  [/weak foot|逆足|弱脚|非惯用/i, "weak_foot"],
  [/right foot|右脚/i, "weak_foot"],
  [/left foot|左脚/i, "weak_foot"],
  [/pass|传球|出球/i, "passing"],
  [/shoot|finish|射门|射术|终结/i, "finishing"],
  [/dribbl|过人|盘带/i, "dribbling"],
  [/press|压迫|摆脱/i, "press_resistance"],
  [/scan|观察|回头/i, "scanning"],
  [/position|站位|选位/i, "positioning"],
  [/defen|防守/i, "defensive_awareness"],
  [/stamina|体能|耐力|fitness/i, "stamina"],
  [/speed|pace|速度/i, "sprint"],
  [/decision|决定|选择/i, "decision_making"],
  [/cross|传中/i, "crossing"],
  [/set piece|定位球|任意球/i, "set_pieces"],
  [/composure|冷静|抗压/i, "composure"],
];

function analyze(prompt: string, attrs: Attributes) {
  const requested: string[] = [];
  for (const [re, key] of ATTRIBUTE_HINTS) if (re.test(prompt)) requested.push(key);
  const weaknesses = weakestAttributes(attrs, 3).map((w) => w.key);
  const strengths = strongestAttributes(attrs, 3).map((w) => w.key);
  // Focus = explicit request first, else the biggest gap for the profile.
  const focus = [...new Set([...requested, ...weaknesses])].slice(0, 2);
  const minutesMatch = prompt.match(/(\d{1,3})\s*(min|minute|分钟|mins)/i);
  const available = minutesMatch ? parseInt(minutesMatch[1], 10) : null;
  return { requested, weaknesses, strengths, focus, available };
}

class DeterministicCoachProvider implements CoachProvider {
  id = "demo-coach-v1";
  available = true;

  async generatePlan(input: PlanInput): Promise<CoachPlan> {
    // Simulate reasoning latency for realistic streaming/loading UX.
    await new Promise((r) => setTimeout(r, 260));
    // The provider matches on English and the reader reads their own column, so the two halves
    // of one prompt are two readings of the SAME row rather than two sentences kept in step.
    const ask = englishRow(input.prompt);
    const { requested, weaknesses, strengths, focus, available } = analyze(
      ask,
      input.profile.attributes,
    );
    // Explicit target attributes (role-gap priorities) win over inferred focus.
    const targeted = [...new Set((input.focusKeys ?? []).filter((k) => ATTRIBUTE_KEYS.includes(k)))].slice(0, 2);
    const effFocus = targeted.length ? targeted : focus;
    const isTargeted = targeted.length > 0;
    let targetMinutes = clampMinutes(available ?? input.availableMinutes);
    const load = input.load;
    // Load-awareness: when recent load is spiking, cap the session so the coach
    // never prescribes extra volume on top of a high acute:chronic ratio.
    if (load?.zone === "high") targetMinutes = Math.min(targetMinutes, 20);
    else if (load?.zone === "caution") targetMinutes = Math.min(targetMinutes, 30);
    const seed = `coach-${hashString(ask + input.profile.displayName)}`;
    const dna = computeDna(input.profile.attributes);
    const session = buildSession({
      // A fresh handle per plan: two plans are two events even when the clock wraps or
      // the ask repeats, so neither can take the other's id (see @/lib/ids).
      id: newId("S"),
      date: new Date().toISOString(),
      targetMinutes,
      focusAttributes: effFocus.length ? effFocus : ["first_touch"],
      group: input.profile.positionGroup,
      seed,
      roleGameFocus: dna.primary.gameFocus,
    });

    const trainedRecently = input.history
      .filter((h) => effFocus.includes(h.focus))
      .reduce((s, h) => s + h.completed, 0);
    // What the session really contains. The player may have asked for two
    // attributes and a decision block, but a short session cannot carry all of
    // them, and the words below may not claim a block that was never built.
    const trained = session.focusAttributes;
    const hasBlock = (phase: string) => session.exercises.some((e) => e.phase === phase);
    // Session-to-session continuity: the coach remembers the focus of the last
    // plan it wrote (from real stored history) and either continues progressive
    // overload on an overlapping attribute or rotates to a different gap.
    const lastFocus = [...new Set((input.lastFocus ?? []).filter((k) => ATTRIBUTE_KEYS.includes(k)))];
    const continuing = lastFocus.filter((k) => trained.includes(k));

    const diagnosisParts: RowText[] = [];
    if (isTargeted)
      diagnosisParts.push(
        trained.length === effFocus.length
          ? { key: "coach.diag.targetedExact", vars: { focus: effFocus.map(attributeLabel).join(" and ") } }
          : { key: "coach.diag.targetedPartial", vars: { focus: effFocus.map(attributeLabel).join(" and "), trained: trained.map(attributeLabel).join(" and "), minutes: session.targetMinutes } },
      );
    if (load && load.zone === "high")
      diagnosisParts.push({ key: "coach.diag.loadHigh", vars: { acwr: load.acwr?.toFixed(2) ?? "high" } });
    else if (load && load.zone === "caution")
      diagnosisParts.push({ key: "coach.diag.loadCaution", vars: { acwr: load.acwr?.toFixed(2) ?? "elevated" } });
    else if (load && load.zone === "under" && load.weekLoad > 0)
      diagnosisParts.push({ key: "coach.diag.loadUnder", vars: { acwr: load.acwr?.toFixed(2) ?? "low" } });
    if (requested.length)
      diagnosisParts.push({ key: "coach.diag.requestedFlagged", vars: { attrs: requested.map(attributeLabel).join(" and ") } });
    diagnosisParts.push({ key: "coach.diag.lowestRated", vars: { attrs: weaknesses.map(attributeLabel).join(", ") } });
    diagnosisParts.push({ key: "coach.diag.strengths", vars: { attrs: strengths.map(attributeLabel).join(", ") } });
    if (trainedRecently > 0)
      diagnosisParts.push({ key: "coach.diag.trainedRecently", vars: { n: trainedRecently, focus: effFocus.map(attributeLabel).join("/") } });

    if (lastFocus.length) {
      if (continuing.length)
        diagnosisParts.push({ key: "coach.diag.continuing", vars: { attrs: continuing.map(attributeLabel).join(" and ") } });
      else
        diagnosisParts.push({ key: "coach.diag.rotated", vars: { last: lastFocus.map(attributeLabel).join(" and "), new: trained.map(attributeLabel).join(" and ") } });
    }

    const rationale: RowText[] = [
      ...(hasBlock("warmup") ? [{ key: "coach.rat.warmup" }] : []),
      { key: "coach.rat.primaryFocus", vars: { focus: trained.map(attributeLabel).join(" + "), target: isTargeted ? "selected role-gap priorities" : "current biggest measurable gap" } },
      ...(hasBlock("decision") ? [{ key: "coach.rat.decisionBlock" }] : []),
      ...(hasBlock("game")
        ? [{ key: "coach.rat.gameBlock", vars: { drill: attributeLabel(dna.primary.gameFocus), archetype: archetypeLabelEn(dna.primary.id) } }]
        : []),
      { key: "coach.rat.dnaRead", vars: { primary: archetypeLabelEn(dna.primary.id), secondary: archetypeLabelEn(dna.secondary.id), game: hasBlock("game") ? " — session shaped to your role" : "" } },
    ];

    const confidence = Math.round(
      (0.55 + (requested.length || isTargeted ? 0.2 : 0) + (input.history.length ? 0.15 : 0)) * 100,
    );

    const sources: RowText[] = [
      { key: "coach.src.methodology" },
      { key: "coach.src.savedAttrs", vars: { rating: overallRating(input.profile.attributes) } },
      { key: "coach.src.positionBaseline" },
      ...(load ? [{ key: "coach.src.loadLog", vars: { acwr: load.acwr?.toFixed(2) ?? "n/a", zone: load.zone } }] : []),
      ...(lastFocus.length ? [{ key: "coach.src.coachMemory", vars: { focus: lastFocus.map(attributeLabel).join(" + ") } }] : []),
    ];

    return {
      id: newId("P"),
      createdAt: new Date().toISOString(),
      prompt: input.prompt,
      diagnosis: diagnosisParts,
      focus: trained,
      session,
      rationale,
      confidence: Math.min(95, confidence),
      sources,
      provider: this.id,
    };
  }
}

function clampMinutes(m: number): number {
  const opts = [5, 10, 20, 30, 45, 60, 90];
  return opts.reduce((p, c) => (Math.abs(c - m) < Math.abs(p - m) ? c : p), opts[0]);
}

// The active provider. Swap to a Cloud-Agent-backed provider when configured.
export const coachProvider: CoachProvider = new DeterministicCoachProvider();

/** The questions the Football AI screen offers as chips. Each one is two things at once — copy a
 *  reader reads, and a query the demo provider matches on Latin tokens (`data/intelligence.ts:246`
 *  strips everything outside `a-z0-9' -`) — so both halves live here rather than in the view: `id`
 *  names the reader's row and `ask` is the English row of the same key, taken through the door that
 *  owns model-input vocabulary. Proof-i18n's 26e refuses an `ask` that has drifted from
 *  `DICTIONARIES.en`, which is what keeps the displayed question and the sent question one fact. */
export const SUGGESTED_ASKS = ["keyPlayer", "league", "value", "transfer"].map((id) => ({
  id,
  ask: englishWord(`ai.sug.${id}`),
}));

// Match-chat / analyst answer (evidence-first) used by Match Intelligence.
export interface AiAnswer {
  text: RowText;
  evidence: RowText[];
  sources: RowText[];
  confidence: number;
}

export async function askFootballAI(
  question: string,
  context: { label: string; facts: string[] },
): Promise<AiAnswer> {
  await new Promise((r) => setTimeout(r, 200));
  const rng = makeRng(`${question}-${context.label}`);
  const fact = context.facts[Math.floor(rng() * context.facts.length)] ?? "No direct data.";
  const lower = question.toLowerCase();
  let leadKey: string;
  if (/who|player|rating|star|最重要/.test(lower))
    leadKey = "ai.lead.player";
  else if (/why|how|怎么|为什么/.test(lower))
    leadKey = "ai.lead.why";
  else
    leadKey = "ai.lead.general";
  return {
    text: { key: "ai.answer.text", vars: { lead: leadKey, fact, count: context.facts.length } },
    evidence: context.facts.slice(0, 4).map((f) => ({ key: "ai.evidence.fact", vars: { fact: f } })),
    sources: [
      { key: "ai.src.matchLabel", vars: { label: context.label } },
      { key: "ai.src.matchEngine" },
    ],
    confidence: 55 + Math.floor(rng() * 30),
  };
}

/** The English reading of a row a reader also sees: `rowLine(row, t)` is what a screen prints,
 *  this is what the provider matches on. Code-holding variables resolve through the name tables
 *  on both sides — the reader's language for the screen, English for `analyze`'s hint patterns —
 *  so a row that trains `focus` is one fact with two readings rather than two sentences to keep
 *  in step. This is the pair M217 built for the sample questions, one level up. */
export function englishRow(row: RowText): string {
  return "key" in row ? rowLine(row, englishWord) ?? englishWord(row.key) : row.value;
}

/** Plans stored before a prompt was a row hold a plain string. Those words are the writer's, so
 *  they are kept verbatim as a value and never guessed at as a key — the same repair a goal title
 *  and a remembered line get, called from the store's hydration boundary. */
export function repairPlanPrompts(plans: CoachPlan[]): CoachPlan[] {
  return plans.map((p) =>
    typeof (p.prompt as unknown) === "string"
      ? { ...p, prompt: asRowText(p.prompt as unknown as string) }
      : p,
  );
}
