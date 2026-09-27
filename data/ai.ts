import type { Attributes, CoachPlan, UserProfile } from "@/domain/types";
import { attributeLabel, weakestAttributes, strongestAttributes, ATTRIBUTE_KEYS, overallRating } from "@/domain/attributes";
import { buildSession } from "@/domain/training";
import { computeDna, archetypeLabelEn } from "@/domain/playerDna";
import { buildLoad, type LoadZone } from "@/domain/load";
import { makeRng, hashString } from "@/lib/rng";

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
  prompt: string;
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
    const { requested, weaknesses, strengths, focus, available } = analyze(
      input.prompt,
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
    const seed = `coach-${hashString(input.prompt + input.profile.displayName)}`;
    const dna = computeDna(input.profile.attributes);
    const session = buildSession({
      id: `S${Date.now().toString(36).slice(-5)}`,
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

    const diagnosisParts: string[] = [];
    if (isTargeted)
      diagnosisParts.push(
        `You chose to work on ${effFocus.map(attributeLabel).join(" and ")} — the role-gap priorities you flagged.` +
          (trained.length === effFocus.length
            ? ` This block is built around exactly those.`
            : ` A ${session.targetMinutes}-minute block has room for ${trained.map(attributeLabel).join(" and ")}, so it starts there.`),
      );
    if (load && load.zone === "high")
      diagnosisParts.push(
        `Your acute:chronic load ratio is ${load.acwr?.toFixed(2) ?? "high"} — a spike. I've kept this session short and lighter to protect you from piling volume on a spiking load.`,
      );
    else if (load && load.zone === "caution")
      diagnosisParts.push(
        `Your load ratio is ${load.acwr?.toFixed(2) ?? "elevated"}, climbing toward the risk band — this session is capped and stays technical.`,
      );
    else if (load && load.zone === "under" && load.weekLoad > 0)
      diagnosisParts.push(
        `Your load ratio is ${load.acwr?.toFixed(2) ?? "low"} — under your recent average, so you have headroom to progress today.`,
      );
    if (requested.length)
      diagnosisParts.push(`You flagged ${requested.map(attributeLabel).join(" and ")}.`);
    diagnosisParts.push(
      `Your lowest-rated attributes are ${weaknesses.map(attributeLabel).join(", ")}.`,
    );
    diagnosisParts.push(`Your profile's strengths are ${strengths.map(attributeLabel).join(", ")}.`);
    if (trainedRecently > 0)
      diagnosisParts.push(
        `You have logged ${trainedRecently} recent block(s) on ${effFocus.map(attributeLabel).join("/")} — we continue progressive overload.`,
      );

    // Session-to-session continuity: the coach remembers the focus of the last
    // plan it wrote (from real stored history) and either continues progressive
    // overload on an overlapping attribute or rotates to a different gap.
    const lastFocus = [...new Set((input.lastFocus ?? []).filter((k) => ATTRIBUTE_KEYS.includes(k)))];
    // "Continuing that progression" is only true of an attribute this block really
    // trains, so the overlap is taken with `trained`, not with what was asked for.
    const continuing = lastFocus.filter((k) => trained.includes(k));
    const rotatedFrom = lastFocus.filter((k) => !effFocus.includes(k));
    if (lastFocus.length) {
      if (continuing.length)
        diagnosisParts.push(
          `We picked up where we left off — last session we worked ${continuing.map(attributeLabel).join(" and ")}, so this block continues that progression.`,
        );
      else
        diagnosisParts.push(
          `Last session we worked ${lastFocus.map(attributeLabel).join(" and ")}; today we rotate to ${trained.map(attributeLabel).join(" and ")} to build a different gap.`,
        );
    }

    const rationale = [
      ...(hasBlock("warmup") ? [`Warm-up activates movement before technique work.`] : []),
      `Primary focus ${trained.map(attributeLabel).join(" + ")} targets your ${isTargeted ? "selected role-gap priorities" : "current biggest measurable gap"}.`,
      ...(hasBlock("decision") ? [`A decision-making block trains scanning under time pressure.`] : []),
      // The role line is only true of a session that really carries the block —
      // a 5-minute session has room for the technique work alone.
      ...(hasBlock("game")
        ? [`The game-realistic block is your ${attributeLabel(dna.primary.gameFocus)} drill — ${archetypeLabelEn(dna.primary.id)}s express themselves there.`]
        : []),
      `DNA read: ${archetypeLabelEn(dna.primary.id)} (${archetypeLabelEn(dna.secondary.id)} → ${archetypeLabelEn(dna.primary.id)})${hasBlock("game") ? " — session shaped to your role" : ""}.`,
    ];

    const confidence = Math.round(
      (0.55 + (requested.length || isTargeted ? 0.2 : 0) + (input.history.length ? 0.15 : 0)) * 100,
    );

    return {
      id: `P${makeRng(seed)().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      prompt: input.prompt,
      diagnosis: diagnosisParts.join(" "),
      focus: trained,
      session,
      rationale,
      confidence: Math.min(95, confidence),
      sources: [
        "Football OS Training Methodology (demo knowledge base)",
        `Your saved attributes (overall ${overallRating(input.profile.attributes)})`,
        "Position baseline model",
        ...(load ? [`Your training-load log (ACWR ${load.acwr?.toFixed(2) ?? "n/a"} · ${load.zone})`] : []),
        ...(lastFocus.length ? [`Coach memory — last session focused on ${lastFocus.map(attributeLabel).join(" + ")}`] : []),
      ],
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

// Match-chat / analyst answer (evidence-first) used by Match Intelligence.
export interface AiAnswer {
  text: string;
  evidence: string[];
  sources: string[];
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
  let lead: string;
  if (/who|player|rating|star|最重要/.test(lower))
    lead = "Demo Mode has no player-influence ranking, so I won't invent a decisive individual — here is what the seeded match record actually supports:";
  else if (/why|how|怎么|为什么/.test(lower))
    lead = `The short answer: the pattern in the underlying events explains it.`;
  else lead = `Here is the read from Football OS intelligence for ${context.label}.`;
  return {
    text: `${lead} ${fact} (confidence reflects evidence from ${context.facts.length} linked data points — this is a DEMO provider, not a live model).`,
    evidence: context.facts.slice(0, 4),
    sources: [`Match ${context.label}`, "Football OS Match Engine (demo)"],
    confidence: 55 + Math.floor(rng() * 30),
  };
}
