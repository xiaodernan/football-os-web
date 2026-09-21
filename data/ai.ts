import type { Attributes, CoachPlan, UserProfile } from "@/domain/types";
import { attributeLabel, weakestAttributes, strongestAttributes, ATTRIBUTE_KEYS } from "@/domain/attributes";
import { buildSession } from "@/domain/training";
import { computeDna } from "@/domain/playerDna";
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
  [/scan|观察|回头|scanning/i, "scanning"],
  [/position|站位|选位/i, "positioning"],
  [/defen|防守/i, "defensive_awareness"],
  [/stamina|体能|耐力|fitness/i, "stamina"],
  [/speed|pace|速度/i, "sprint"],
  [/decision|决定|选择|选择球/i, "decision_making"],
  [/cross|传中/i, "crossing"],
  [/set piece|定位球|任意球/i, "set_pieces"],
  [/composure|冷静|抗压/i, "composure"],
];

function nearestWeakAttr(prompt: string, attrs: Attributes): string {
  return weakestAttributes(attrs, 1)[0].key;
}

function analyze(prompt: string, attrs: Attributes) {
  const requested: string[] = [];
  for (const [re, key] of ATTRIBUTE_HINTS) if (re.test(prompt)) requested.push(key);
  const weaknesses = weakestAttributes(attrs, 3).map((w) => w.key);
  const strengths = strongestAttributes(attrs, 3).map((w) => w.key);
  // Focus = explicit request first, else the biggest gap for the profile.
  const focus = [...new Set([...requested, ...weaknesses])].slice(0, requested.length ? 2 : 2);
  const minutesMatch = prompt.match(/(\d{1,3})\s*(min|minute|分钟|分钟|mins)/i);
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
    const session = buildSession({
      id: `S${Date.now().toString(36).slice(-5)}`,
      date: new Date().toISOString(),
      targetMinutes,
      focusAttributes: effFocus.length ? effFocus : ["first_touch"],
      group: input.profile.positionGroup,
      seed,
    });

    const trainedRecently = input.history
      .filter((h) => effFocus.includes(h.focus))
      .reduce((s, h) => s + h.completed, 0);

    const diagnosisParts: string[] = [];
    if (isTargeted)
      diagnosisParts.push(
        `You chose to work on ${effFocus.map(attributeLabel).join(" and ")} — the role-gap priorities you flagged. This block is built around exactly those.`,
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

    const dna = computeDna(input.profile.attributes);
    const rationale = [
      `Warm-up activates movement before technique work.`,
      `Primary focus ${effFocus.map(attributeLabel).join(" + ")} targets your ${isTargeted ? "selected role-gap priorities" : "current biggest measurable gap"}.`,
      `A decision-making block trains scanning under time pressure.`,
      `A game-realistic drill transfers the technique into match context.`,
      `DNA read: ${dna.primary.label} (${dna.evolutionPath}) — session shaped to your role.`,
    ];

    const confidence = Math.round(
      (0.55 + (requested.length || isTargeted ? 0.2 : 0) + (input.history.length ? 0.15 : 0)) * 100,
    );

    return {
      id: `P${makeRng(seed)().toString(36).slice(2, 7)}`,
      createdAt: new Date().toISOString(),
      prompt: input.prompt,
      diagnosis: diagnosisParts.join(" "),
      focus: effFocus,
      session,
      rationale,
      confidence: Math.min(95, confidence),
      sources: [
        "Football OS Training Methodology (demo knowledge base)",
        `Your saved attributes (overall ${Math.round(input.profile.xp / 100 + 40)})`,
        "Position baseline model",
        ...(load ? [`Your training-load log (ACWR ${load.acwr?.toFixed(2) ?? "n/a"} · ${load.zone})`] : []),
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
    lead = `Based on the match data, the most influential figure stands out in ${context.facts[0] ?? "the key actions"}.`;
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
