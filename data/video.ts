import { makeRng, hashString, rngInt, pick } from "@/lib/rng";
import type { Attributes } from "@/domain/types";
import { attributeLabel, weakestAttributes } from "@/domain/attributes";

// Video pipeline (spec §19). Real stages, provider abstraction. When no genuine
// video model is configured, the DemoVideoProvider runs the SAME pipeline over a
// deterministic fingerprint of the uploaded file and is explicitly labelled DEMO.
// It never pretends to be a real pose model.

export interface VideoEvent {
  t: number; // seconds
  kind: "scan" | "touch" | "pass" | "dribble" | "shot" | "turn" | "press";
  note: string;
  confidence: number;
}

export interface VideoReport {
  fileId: string;
  fileName: string;
  durationSec: number;
  provider: string;
  demo: boolean;
  strengths: string[];
  weaknesses: string[];
  improvements: string[];
  events: VideoEvent[];
  frames: { t: number; label: string }[];
  confidence: number;
  recommendedFocus: string[];
}

export interface VideoProvider {
  id: string;
  demo: boolean;
  analyze(input: { fileId: string; fileName: string; sizeBytes: number; attrs: Attributes }): Promise<VideoReport>;
}

class DemoVideoProvider implements VideoProvider {
  id = "demo-video-v1";
  demo = true;
  async analyze(input: { fileId: string; fileName: string; sizeBytes: number; attrs: Attributes }): Promise<VideoReport> {
    // Simulate async processing (frame extraction, detection) with progress.
    await new Promise((r) => setTimeout(r, 500));
    const rng = makeRng(`${input.fileId}-${hashString(input.fileName + input.sizeBytes)}`);
    const durationSec = rngInt(rng, 40, 180);
    const events: VideoEvent[] = [];
    const kinds: VideoEvent["kind"][] = ["scan", "touch", "pass", "dribble", "shot", "turn", "press"];
    const n = rngInt(rng, 8, 16);
    for (let i = 0; i < n; i++) {
      const kind = pick(rng, kinds);
      events.push({
        t: Math.round((i / n) * durationSec),
        kind,
        note: eventNote(kind, rng),
        confidence: 0.6 + rng() * 0.35,
      });
    }
    const weak = weakestAttributes(input.attrs, 3).map((w) => w.key);
    const strengths = ["Keeps the head up before receiving in open play", "Strong first movement into space after the pass"];
    const weaknesses = [
      `Body orientation delays the next action on the ${attributeLabel(weak[0]).toLowerCase()} sequence`,
      `Scanning frequency drops under press (${events.filter((e) => e.kind === "scan").length} scans detected)`,
    ];
    return {
      fileId: input.fileId,
      fileName: input.fileName,
      durationSec,
      provider: this.id,
      demo: true,
      strengths,
      weaknesses,
      improvements: [
        `Increase pre-reception scanning (target: look over both shoulders every 2–3s)`,
        `Open the body to play forward on the ${attributeLabel(weak[0])} reps`,
        `Two-touch control drills to shorten the first touch under pressure`,
      ],
      events: events.sort((a, b) => a.t - b.t),
      frames: events.slice(0, 4).map((e) => ({ t: e.t, label: `${e.kind.toUpperCase()} @ ${e.t}s` })),
      confidence: Math.round((0.55 + rng() * 0.25) * 100),
      recommendedFocus: [weak[0], "scanning"],
    };
  }
}

function eventNote(kind: VideoEvent["kind"], rng: () => number): string {
  const opts: Record<VideoEvent["kind"], string[]> = {
    scan: ["Head check before ball arrives", "Scanned blind side", "No scan — ball-side only"],
    touch: ["Clean first touch into space", "Touch slightly heavy", "Ball sticks under pressure"],
    pass: ["Weighted pass splits the line", "Pass under duress", "Safe sideways option"],
    dribble: ["Beats the first defender", "Loses control in contact", "Drag-back creates angle"],
    shot: ["Struck cleanly across goal", "Off balance strike", "Blocked by late defender"],
    turn: ["Half-turn into midfield", "Turn too heavy", "Opens hips to go forward"],
    press: ["Immediate counter-press", "Recovery run", "Bypassed by first touch"],
  };
  const arr = opts[kind];
  return arr[Math.floor(rng() * arr.length)];
}

export const videoProvider: VideoProvider = new DemoVideoProvider();
