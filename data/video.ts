import { makeRng, hashString, rngInt, pick } from "@/lib/rng";
import type { Attributes } from "@/domain/types";
import type { RowText } from "@/domain/rowText";
import { weakestAttributes } from "@/domain/attributes";
import { FILM_KINDS, FILM_KIND_KEY, type FilmEventKind } from "@/domain/filmInsights";

// Video pipeline (spec §19). Real stages, provider abstraction. When no genuine
// video model is configured, the DemoVideoProvider runs the SAME pipeline over a
// deterministic fingerprint of the uploaded file and is explicitly labelled DEMO.
// It never pretends to be a real pose model.

export type VideoKind = FilmEventKind;

/** The seven detections the demo pipeline can report. Re-exported from the film library's own
 *  list since M235: the dictionary's kind rows, the badge the Film Room prints, the Weekly
 *  Review's bars, the evidence-frame caption and the insights evidence line are five reads of
 *  one list, and a gate can only count a space it can read. */
export const VIDEO_KINDS: readonly VideoKind[] = FILM_KINDS;

/** The dictionary key for a detection kind — the badge, the frame caption and the evidence line
 *  all name it, so none of them prints the code. It lives in domain/filmInsights.ts because
 *  that is the module that composes the evidence row, and a domain module may not reach up
 *  into `data/`; this alias keeps the name the Film Room and the review already import. */
export const VIDEO_KIND_KEY: Record<VideoKind, string> = FILM_KIND_KEY;

/** Three captions per detection kind. The seeded draw picks WHICH caption, never the words: each
 *  id is a row in all three locales, and this table is the enumeration a gate reads, so a new
 *  kind cannot ship with no captions and a fifth caption cannot ship as an id nothing can reach. */
export const VIDEO_NOTE_IDS: Record<VideoKind, readonly string[]> = {
  scan: ["vid.note.scan.0", "vid.note.scan.1", "vid.note.scan.2"],
  touch: ["vid.note.touch.0", "vid.note.touch.1", "vid.note.touch.2"],
  pass: ["vid.note.pass.0", "vid.note.pass.1", "vid.note.pass.2"],
  dribble: ["vid.note.dribble.0", "vid.note.dribble.1", "vid.note.dribble.2"],
  shot: ["vid.note.shot.0", "vid.note.shot.1", "vid.note.shot.2"],
  turn: ["vid.note.turn.0", "vid.note.turn.1", "vid.note.turn.2"],
  press: ["vid.note.press.0", "vid.note.press.1", "vid.note.press.2"],
};

/** The improvement rows, in the order the Film Room lists them. The first is what the film prompt
 *  carries, and it is carried as a KEY: `improvement` is a key-holding variable since M231, so a
 *  简体中文 reader is shown the Chinese improvement inside the Chinese prompt on their timeline. */
export const VIDEO_IMPROVEMENT_IDS: readonly string[] = ["vid.imp.0", "vid.imp.1", "vid.imp.2"];

export interface VideoEvent {
  t: number; // seconds
  kind: VideoKind;
  note: RowText;
  confidence: number;
}

export interface VideoReport {
  fileId: string;
  fileName: string;
  durationSec: number;
  provider: string;
  demo: boolean;
  strengths: RowText[];
  weaknesses: RowText[];
  improvements: RowText[];
  events: VideoEvent[];
  frames: { t: number; label: RowText }[];
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
    const kinds: VideoKind[] = [...VIDEO_KINDS];
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
    const scanCount = events.filter((e) => e.kind === "scan").length;
    return {
      fileId: input.fileId,
      fileName: input.fileName,
      durationSec,
      provider: this.id,
      demo: true,
      strengths: [{ key: "vid.strength.0" }, { key: "vid.strength.1" }],
      // The attribute the flag names travels as its KEY, not as the English label the provider
      // used to compose: `attr` is a code-holding variable, so a 简体中文 reader reads the attribute
      // name in 简体中文 inside the sentence about their own clip.
      weaknesses: [
        { key: "vid.weak.0", vars: { attr: weak[0] } },
        { key: "vid.weak.1", vars: { n: scanCount } },
      ],
      improvements: VIDEO_IMPROVEMENT_IDS.map((id) => ({ key: id })),
      events: events.sort((a, b) => a.t - b.t),
      // The frame caption named the code in capitals ("SCAN @ 12s") on a Chinese screen; the
      // kind travels as the key of its own row and the seconds as the one number they are.
      frames: events.slice(0, 4).map((e) => ({ t: e.t, label: { key: "vid.frame.label", vars: { event: VIDEO_KIND_KEY[e.kind], t: e.t } } })),
      confidence: Math.round((0.55 + rng() * 0.25) * 100),
      recommendedFocus: [weak[0], "scanning"],
    };
  }
}

/** One caption for one detection. The seeded draw picks WHICH of the kind's three declared rows
 *  this detection gets — one `rng()` call, the same one the hand-written captions used — and the
 *  words come from the dictionary in the reader's language (M231). */
function eventNote(kind: VideoKind, rng: () => number): RowText {
  const ids = VIDEO_NOTE_IDS[kind];
  return { key: ids[Math.floor(rng() * ids.length)] };
}

export const videoProvider: VideoProvider = new DemoVideoProvider();
